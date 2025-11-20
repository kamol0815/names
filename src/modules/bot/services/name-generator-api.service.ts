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

interface NameConstraints {
    prefix?: string;
    suffix?: string;
    includes?: string[];
}

interface NameBlueprint {
    draftName: string;
    gender: 'boy' | 'girl';
    confidence: number;
    constraints: NameConstraints;
    storyBuilder: (resolvedName: string) => string;
}

@Injectable()
export class NameGeneratorApiService {
    private readonly logger = new Logger(NameGeneratorApiService.name);
    private readonly API_URL = 'http://94.158.53.20:8080/names_content.php';

    private readonly FALLBACK_GIRL_NAMES = [
        'Aisha', 'Anora', 'Aziza', 'Barno', 'Dilnoza', 'Durdona', 'Farangiz',
        'Gulbahor', 'Gulnora', 'Kabira', 'Kamola', 'Komila', 'Laylo', 'Malika',
        'Muslima', 'Nilufar', 'Nodira', 'Oisha', 'Oydin', 'Shahnoza', 'Shirin',
        'Zarina', 'Zilola', 'Zuhra', 'Muhabbat', 'Nasiba', 'Dilfuza', 'Gulchehra',
        'Madina', 'Sayyora', 'Sabina', 'Umida', 'Muslimah', 'Rayhona', 'Zebo',
        'Adolat', 'Sarvinoz', 'Mehribon', 'Mahliyo', 'Shahodat', 'Yulduz', 'Nafisa',
        'Gulshan', 'Sitora', 'Shahzoda', 'Gulrux', 'Mehrigul', 'Ruqiya', 'Saodat',
        'Rano', 'Yorqinoy'
    ];

    private readonly FALLBACK_BOY_NAMES = [
        'Abdulloh', 'Amir', 'Alisher', 'Akmal', 'Bekzod', 'Davron', 'Elyor',
        'Farrux', 'Husan', 'Islom', 'Jahongir', 'Kamol', 'Kamoliddin', 'Mansur',
        'Nodir', 'Odil', 'Ravshan', 'Sardor', 'Timur', 'Umid', 'Zafar', 'Kamron',
        'Samir', 'Rustam', 'Komron', 'Shukrullo', 'Muslim', 'Azamat', 'Shohruh',
        'Abror', 'Behruz', 'Bilol', 'Diyor', 'Erkin', 'Habib', 'Jamshid', 'Karim',
        'Laziz', 'Mironshoh', 'Navruz', 'Oybek', 'Qahramon', 'Rahim', 'Sherzod',
        'Tursun', 'Umar', 'Yusuf', 'Ziyod', 'Zohid', 'Muhsin'
    ];

    constructor(private readonly httpService: HttpService) { }

    /**
     * 🧬 Senior darajadagi algoritm
     *  - Ota va ona ismlaridan harflar olinadi
     *  - Avval APIdan aniq ism tekshiriladi
     *  - Topilmasa, yaqin real ismga o'tiladi
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

        const results: GeneratedName[] = [];
        const seen = new Set<string>();

        for (const blueprint of filteredBlueprints) {
            const resolved = await this.resolveBlueprint(blueprint);
            if (!resolved || seen.has(resolved.name)) {
                continue;
            }

            seen.add(resolved.name);
            results.push({
                name: resolved.name,
                meaning: `${resolved.api.meaning}\n\n${resolved.story}`,
                origin: resolved.api.origin,
                gender: blueprint.gender,
                confidence: blueprint.confidence,
            });
        }

        if (!results.length) {
            for (const blueprint of blueprints) {
                const resolved = await this.resolveBlueprint(blueprint);
                if (resolved && !seen.has(resolved.name)) {
                    results.push({
                        name: resolved.name,
                        meaning: `${resolved.api.meaning}\n\n${resolved.story}`,
                        origin: resolved.api.origin,
                        gender: blueprint.gender,
                        confidence: blueprint.confidence,
                    });
                    break;
                }
            }
        }

        return results;
    }

    /**
     * 👨‍👩‍👧‍👦 Harf bloklarini qurish
     */
    private buildBlueprints(fatherName: string, motherName: string): NameBlueprint[] {
        const fatherLower = fatherName.toLowerCase();
        const motherLower = motherName.toLowerCase();

        const fatherFirst = fatherLower[0] ?? '';
        const fatherSecond = fatherLower[1] ?? '';
        const fatherPrefixTwo = (fatherFirst + fatherSecond).substring(0, fatherSecond ? 2 : 1);
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
            const rawName = this.composeName([
                fatherFirst,
                fatherSecond || '',
                'bi',
                motherLastTwo,
            ]);

            blueprints.push({
                draftName: rawName,
                gender: 'girl',
                confidence: 95,
                constraints: {
                    prefix: fatherPrefixTwo,
                    suffix: motherLastTwo,
                    includes: [fatherFirst, motherLastTwo],
                },
                storyBuilder: (resolvedName: string) =>
                    `👧 ${resolvedName} = ${fatherName} ismidan "${(fatherFirst + fatherSecond).toUpperCase()}" bo'g'ini va ` +
                    `${motherName} ismidan oxirgi "${motherLastTwo.toUpperCase()}" harflari olindi. "bi" bo'g'ini talaffuzni yumshatdi.`,
            });
        }

        if (fatherFirstChunk && motherMix) {
            const rawName = this.composeName([fatherFirstChunk, motherMix]);

            blueprints.push({
                draftName: rawName,
                gender: 'boy',
                confidence: 90,
                constraints: {
                    prefix: fatherFirstChunk,
                    suffix: motherMix,
                    includes: [fatherFirstChunk, motherMix],
                },
                storyBuilder: (resolvedName: string) =>
                    `👦 ${resolvedName} = ${fatherName} ismidan "${fatherFirstChunk.toUpperCase()}" bo'g'ini ` +
                    `va ${motherName} ismida olingan "${motherMix.toUpperCase()}" harflar uyg'unlashuvi.`,
            });
        }

        if (motherFirstTwo && fatherLastTwo) {
            const rawName = this.composeName([motherFirstTwo, fatherLastTwo]);
            const explanation = (resolvedName: string) =>
                `🔁 ${resolvedName} - ${motherName} boshidagi "${motherFirstTwo.toUpperCase()}" ` +
                `hamda ${fatherName} oxiridagi "${fatherLastTwo.toUpperCase()}" harflari bilan to'qildi.`;

            blueprints.push({
                draftName: rawName,
                gender: 'girl',
                confidence: 75,
                constraints: {
                    prefix: motherFirstTwo,
                    suffix: fatherLastTwo,
                    includes: [motherFirstTwo, fatherLastTwo],
                },
                storyBuilder: explanation,
            });

            blueprints.push({
                draftName: rawName,
                gender: 'boy',
                confidence: 75,
                constraints: {
                    prefix: motherFirstTwo,
                    suffix: fatherLastTwo,
                    includes: [motherFirstTwo, fatherLastTwo],
                },
                storyBuilder: explanation,
            });
        }

        return blueprints;
    }

    /**
     * Blueprintni API orqali tasdiqlash yoki fallback topish
     */
    private async resolveBlueprint(blueprint: NameBlueprint): Promise<{
        name: string;
        api: { meaning: string; origin: string };
        story: string;
    } | null> {
        const exact = await this.lookupName(blueprint.draftName);
        if (exact) {
            return {
                name: blueprint.draftName,
                api: exact,
                story: blueprint.storyBuilder(blueprint.draftName),
            };
        }

        const fallbackName = this.findClosestRealName(blueprint.constraints, blueprint.gender);
        if (fallbackName) {
            const fallbackApi = await this.lookupName(fallbackName);
            if (fallbackApi) {
                const explanation = `${blueprint.storyBuilder(fallbackName)}\n\nℹ️ ${fallbackName} ismi real bazadan topildi va ` +
                    `ota-onadan olingan bo'g'inlarga eng yaqin moslik tufayli tanlandi.`;
                return {
                    name: fallbackName,
                    api: fallbackApi,
                    story: explanation,
                };
            }
        }

        return null;
    }

    /**
     * Fallback ro'yxatidan mos ismni qidirish
     */
    private findClosestRealName(constraints: NameConstraints, gender: 'boy' | 'girl'): string | null {
        const pool = gender === 'girl' ? this.FALLBACK_GIRL_NAMES : this.FALLBACK_BOY_NAMES;
        const normalizedConstraints = {
            prefix: constraints.prefix?.toLowerCase(),
            suffix: constraints.suffix?.toLowerCase(),
            includes: (constraints.includes ?? []).map((item) => item.toLowerCase()),
        };

        const scored = pool
            .map((name) => {
                const lower = name.toLowerCase();
                let score = 0;

                if (normalizedConstraints.prefix) {
                    if (lower.startsWith(normalizedConstraints.prefix)) {
                        score += 50;
                    } else if (lower.includes(normalizedConstraints.prefix)) {
                        score += 25;
                    }
                }

                if (normalizedConstraints.suffix) {
                    if (lower.endsWith(normalizedConstraints.suffix)) {
                        score += 40;
                    } else if (lower.includes(normalizedConstraints.suffix)) {
                        score += 20;
                    }
                }

                for (const chunk of normalizedConstraints.includes ?? []) {
                    if (chunk && lower.includes(chunk)) {
                        score += 10;
                    }
                }

                return { name, score };
            })
            .filter((candidate) => candidate.score > 0)
            .sort((a, b) => b.score - a.score);

        return scored[0]?.name ?? null;
    }

    /**
     * 🔡 Bo'g'inlardan ism yig'ish
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
                meaning: meaning || `${name} ismi bazada mavjud, ammo ma'nosi to'liq ko'rsatilmagan.`,
                origin,
            };
        } catch (error) {
            this.logger.warn(`Ism API dan olinmadi (${name}): ${error.message}`);
            return null;
        }
    }
}
