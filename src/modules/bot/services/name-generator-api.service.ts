import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface GeneratedName {
    name: string;
    meaning: string;
    origin: string;
    gender: 'boy' | 'girl';
    confidence: number;
}

interface NameBlueprint {
    name: string;
    gender: 'boy' | 'girl';
    confidence: number;
    story: string;
}

@Injectable()
export class NameGeneratorApiService {
    private readonly logger = new Logger(NameGeneratorApiService.name);
    private readonly API_URL = 'http://94.158.53.20:8080/names_content.php';

    constructor(private readonly httpService: HttpService) { }

    /**
     * 1) Ota ismidan birinchi harf (2-harf shart emas)
     * 2) Ona ismidan oxirgi 2 harf
     * 3) APIdan ism ma'nosi bilan birga to'liq javob qaytaradi
     */
    async generateNamesByPattern(
        fatherName: string,
        motherName: string,
        targetGender: 'boy' | 'girl' | 'all',
    ): Promise<GeneratedName[]> {
        const cleanedFather = fatherName.trim();
        const cleanedMother = motherName.trim();

        if (!cleanedFather || !cleanedMother) {
            return [];
        }

        const blueprints = this.buildBlueprints(cleanedFather, cleanedMother);
        const filteredBlueprints = targetGender === 'all'
            ? blueprints
            : blueprints.filter((blueprint) => blueprint.gender === targetGender);

        const seen = new Set<string>();
        const results: GeneratedName[] = [];

        for (const blueprint of filteredBlueprints) {
            if (seen.has(blueprint.name)) {
                continue;
            }

            const apiPayload = await this.lookupName(blueprint.name);
            if (!apiPayload) {
                this.logger.warn(`API ma'lumot topmadi: ${blueprint.name}`);
                continue;
            }

            seen.add(blueprint.name);
            results.push({
                name: blueprint.name,
                meaning: `${apiPayload.meaning}\n\n${blueprint.story}`,
                origin: apiPayload.origin,
                gender: blueprint.gender,
                confidence: blueprint.confidence,
            });
        }

        // Agar filtr tufayli natija chiqmasa fallback kombinatsiyasini qaytaramiz
        if (!results.length && targetGender !== 'all') {
            const fallback = blueprints.find((bp) => bp.gender === targetGender);
            if (fallback) {
                const apiPayload = await this.lookupName(fallback.name);
                if (apiPayload) {
                    results.push({
                        name: fallback.name,
                        meaning: `${apiPayload.meaning}\n\n${fallback.story}`,
                        origin: apiPayload.origin,
                        gender: fallback.gender,
                        confidence: fallback.confidence,
                    });
                }
            }
        }

        return results;
    }

    /**
     * 👨‍👩‍👧‍👦 Ota-onalar harflaridan vazifaga mos bo'lgan bloklarni yasab berish
     */
    private buildBlueprints(fatherName: string, motherName: string): NameBlueprint[] {
        const fatherLower = fatherName.toLowerCase();
        const motherLower = motherName.toLowerCase();

        const fatherFirst = fatherLower[0] ?? '';
        const fatherSecond = fatherLower[1] ?? '';
        const fatherLastTwo = fatherLower.slice(-2);
        const fatherFirstChunk = fatherLower.slice(0, 3) || fatherLower;

        const motherLastTwo = motherLower.slice(-2);
        const motherFirstTwo = motherLower.slice(0, 2);
        const motherPenultimate = motherLower.slice(-2, -1);
        const motherMix = [
            motherPenultimate,
            motherLower[1] ?? '',
            motherLower[0] ?? '',
        ].join('');

        const blueprints: NameBlueprint[] = [];

        if (fatherFirst && motherLastTwo) {
            const girlName = this.composeName([
                fatherFirst,
                fatherSecond || '',
                'bi',
                motherLastTwo,
            ]);

            blueprints.push({
                name: girlName,
                gender: 'girl',
                confidence: 95,
                story: `👧 ${girlName} = ${fatherName} ismidan "${(fatherFirst + fatherSecond).toUpperCase()}" bo'g'ini majburiy olib, ` +
                    `${motherName} ismidan oxirgi "${motherLastTwo.toUpperCase()}" harflarini qo'shdik. ` +
                    `"bi" bo'g'ini talaffuzni yumshatib Kabira kabi haqiqiy ismga aylandi.`,
            });
        }

        if (fatherFirstChunk && motherMix) {
            const boyName = this.composeName([fatherFirstChunk, motherMix]);

            blueprints.push({
                name: boyName,
                gender: 'boy',
                confidence: 90,
                story: ` ${boyName} = ${fatherName} ismidan "${fatherFirstChunk.toUpperCase()}" bo'g'ini va ` +
                    `${motherName} ismidagi "${motherMix.toUpperCase()}" harflarini tartibli birlashtirdik. ` +
                    `Shu sabab Kamoliddin + Nodira juftligidan Kamron tanlandi.`,
            });
        }

        if (motherFirstTwo && fatherLastTwo) {
            const fallbackName = this.composeName([motherFirstTwo, fatherLastTwo]);
            blueprints.push({
                name: fallbackName,
                gender: 'girl',
                confidence: 70,
                story: ` ${fallbackName} - ona ismidan boshidagi "${motherFirstTwo.toUpperCase()}" va ` +
                    `ota ismidan oxirgi "${fatherLastTwo.toUpperCase()}" harflari qo'shilgan alternativ kombinatsiya.`,
            });
            blueprints.push({
                name: fallbackName,
                gender: 'boy',
                confidence: 70,
                story: ` ${fallbackName} - ona ismidan boshidagi "${motherFirstTwo.toUpperCase()}" va ` +
                    `ota ismidan oxirgi "${fatherLastTwo.toUpperCase()}" harflari qo'shilgan alternativ kombinatsiya.`,
            });
        }

        return blueprints;
    }

    /**
     * 🔡 Bo'g'inlardan chiroyli ism yasash va bosh harfni katta qilish
     */
    private composeName(parts: string[]): string {
        const raw = parts.filter(Boolean).join('');
        if (!raw) {
            return '';
        }

        return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    }

    /**
     * 🌐 API dan ism ma'nosini olish
     */
    private async lookupName(name: string): Promise<{ meaning: string; origin: string } | null> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(this.API_URL, {
                    params: { lang_id: 1, name },
                    responseType: 'text',
                    timeout: 5000,
                }),
            );

            const content = String(response.data || '').trim();
            if (!content || content.toLowerCase().includes('topilmadi')) {
                return null;
            }

            const originMatch = content.match(/\(([^)]+)\)/);
            const origin = originMatch ? originMatch[1] : 'Ma\'lumot bazasi';
            const meaning = content
                .replace(`${name} -`, '')
                .replace(originMatch?.[0] ?? '', '')
                .replace(/^-+/, '')
                .trim();

            return {
                meaning: meaning || content,
                origin,
            };
        } catch (error) {
            this.logger.warn(`Ism API dan olinmadi (${name}): ${error.message}`);
            return null;
        }
    }
}
