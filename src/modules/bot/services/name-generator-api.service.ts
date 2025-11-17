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

@Injectable()
export class NameGeneratorApiService {
    private readonly logger = new Logger(NameGeneratorApiService.name);

    // Uzbek name patterns database
    private readonly UZBEK_NAMES_GIRL = [
        'Aisha', 'Anora', 'Aziza', 'Barno', 'Dilnoza', 'Durdona', 'Farangiz',
        'Gulnora', 'Kamola', 'Laylo', 'Malika', 'Muslima', 'Nilufar', 'Nodira',
        'Oisha', 'Oydin', 'Shahnoza', 'Shirin', 'Zarina', 'Zilola', 'Zuhra',
        'Komila', 'Muhabbat', 'Nasiba', 'Dilfuza', 'Gulchehra', 'Madina'
    ];

    private readonly UZBEK_NAMES_BOY = [
        'Abdulloh', 'Amir', 'Alisher', 'Akmal', 'Bekzod', 'Davron', 'Elyor',
        'Farrux', 'Husan', 'Islom', 'Jahongir', 'Kamol', 'Kamoliddin', 'Mansur',
        'Nodir', 'Odil', 'Ravshan', 'Sardor', 'Timur', 'Umid', 'Zafar'
    ];

    private readonly NAME_MEANINGS = {
        // Girls
        'Aisha': { meaning: 'Hayotiy, tirik', origin: 'Arabcha' },
        'Komila': { meaning: 'Mukammal, kamolotga yetgan', origin: 'Arabcha' },
        'Kamola': { meaning: 'Kamolotga yetgan, to\'liq', origin: 'Arabcha' },
        'Oisha': { meaning: 'Hayot beruvchi, jonli', origin: 'Arabcha' },
        'Anora': { meaning: 'Anor mevasi, go\'zal', origin: 'Forscha' },
        'Aziza': { meaning: 'Aziz, hurmatli', origin: 'Arabcha' },
        'Dilnoza': { meaning: 'Dilni o\'ziga tortuvchi', origin: 'Forscha' },
        'Malika': { meaning: 'Malika, qirolicha', origin: 'Arabcha' },
        'Muslima': { meaning: 'Musulmon ayol', origin: 'Arabcha' },
        'Zuhra': { meaning: 'Tong yulduzi, yorug\'lik', origin: 'Arabcha' },
        'Madina': { meaning: 'Muqaddas shahar', origin: 'Arabcha' },

        // Boys
        'Kamoliddin': { meaning: 'Dinining kamoli, mukammal', origin: 'Arabcha' },
        'Kamol': { meaning: 'Kamolot, mukammallik', origin: 'Arabcha' },
        'Amir': { meaning: 'Rahbar, amirlik qiluvchi', origin: 'Arabcha' },
        'Islom': { meaning: 'Tinchlik, totuvlik', origin: 'Arabcha' },
        'Jahongir': { meaning: 'Dunyoni egallagan', origin: 'Forscha' },
        'Alisher': { meaning: 'Arslon sifatli', origin: 'Arabcha-Forscha' },
    };

    constructor(private readonly httpService: HttpService) { }

    /**
     * 🧬 ADVANCED NAME GENERATOR v3.0
     * Father's first letter + Mother's last letter pattern matching
     * Uses intelligent fuzzy matching and real name database
     */
    async generateNamesByPattern(
        fatherName: string,
        motherName: string,
        targetGender: 'boy' | 'girl' | 'all',
    ): Promise<GeneratedName[]> {
        const fatherFirstLetter = fatherName.trim().toLowerCase()[0];
        const motherLastLetter = motherName.trim().toLowerCase().slice(-1);

        this.logger.log(`🧬 Generating names: Father[${fatherName}] first='${fatherFirstLetter}', Mother[${motherName}] last='${motherLastLetter}'`);

        const namePool = targetGender === 'boy' ? this.UZBEK_NAMES_BOY :
            targetGender === 'girl' ? this.UZBEK_NAMES_GIRL :
                [...this.UZBEK_NAMES_BOY, ...this.UZBEK_NAMES_GIRL];

        const results: GeneratedName[] = [];

        // ═══════════════════════════════════════════════════════════════
        // STRATEGY 1: Exact Pattern Match (First + Last letter)
        // Priority: HIGHEST
        // ═══════════════════════════════════════════════════════════════
        for (const name of namePool) {
            const nameLower = name.toLowerCase();
            const firstChar = nameLower[0];
            const lastChar = nameLower.slice(-1);

            let confidence = 0;
            let matchType = '';

            // Perfect match: starts with father's first AND ends with mother's last
            if (firstChar === fatherFirstLetter && lastChar === motherLastLetter) {
                confidence = 95;
                matchType = '🏆 PERFECT DUAL';
            }
            // Good match: starts with father's first letter
            else if (firstChar === fatherFirstLetter) {
                confidence = 75;
                matchType = '👨 FATHER PREFIX';
            }
            // Good match: ends with mother's last letter
            else if (lastChar === motherLastLetter) {
                confidence = 70;
                matchType = '👩 MOTHER SUFFIX';
            }
            // Letter presence check
            else if (nameLower.includes(fatherFirstLetter) && nameLower.includes(motherLastLetter)) {
                confidence = 50;
                matchType = '🧬 CONTAINS BOTH';
            }
            // Single letter match
            else if (nameLower.includes(fatherFirstLetter) || nameLower.includes(motherLastLetter)) {
                confidence = 30;
                matchType = '📊 PARTIAL';
            } else {
                continue; // Skip if no match
            }

            const nameInfo = this.NAME_MEANINGS[name] || {
                meaning: 'Go\'zal va ma\'noli ism',
                origin: 'O\'zbekcha'
            };

            const gender = this.UZBEK_NAMES_GIRL.includes(name) ? 'girl' : 'boy';

            // Skip if gender doesn't match filter
            if (targetGender !== 'all' && gender !== targetGender) {
                continue;
            }

            results.push({
                name,
                meaning: `${nameInfo.meaning} [${matchType}]`,
                origin: nameInfo.origin,
                gender,
                confidence,
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // STRATEGY 2: Syllable Blending (Advanced)
        // Extract syllables from parent names and find matches
        // ═══════════════════════════════════════════════════════════════
        const fatherSyllables = this.extractSyllables(fatherName);
        const motherSyllables = this.extractSyllables(motherName);

        for (const name of namePool) {
            // Skip if already added
            if (results.find(r => r.name === name)) continue;

            const nameLower = name.toLowerCase();
            let syllableMatches = 0;

            // Check syllable overlaps
            for (const syl of fatherSyllables) {
                if (nameLower.includes(syl)) syllableMatches++;
            }
            for (const syl of motherSyllables) {
                if (nameLower.includes(syl)) syllableMatches++;
            }

            if (syllableMatches >= 2) {
                const nameInfo = this.NAME_MEANINGS[name] || {
                    meaning: 'Go\'zal va ma\'noli ism',
                    origin: 'O\'zbekcha'
                };

                const gender = this.UZBEK_NAMES_GIRL.includes(name) ? 'girl' : 'boy';
                if (targetGender !== 'all' && gender !== targetGender) continue;

                results.push({
                    name,
                    meaning: `${nameInfo.meaning} [🧬 ${syllableMatches} SYLLABLE MATCH]`,
                    origin: nameInfo.origin,
                    gender,
                    confidence: 40 + (syllableMatches * 10),
                });
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // STRATEGY 3: API Fallback (if available)
        // Query external name meaning API for verification
        // ═══════════════════════════════════════════════════════════════
        try {
            // Optional: Call external API to enrich results
            await this.enrichWithExternalAPI(results);
        } catch (error) {
            this.logger.warn('External API unavailable, using local database');
        }

        // Sort by confidence score
        results.sort((a, b) => b.confidence - a.confidence);

        // Return top 10 results
        return results.slice(0, 10);
    }

    /**
     * Extract syllables from name (2-3 letter chunks)
     */
    private extractSyllables(name: string): string[] {
        const normalized = name.trim().toLowerCase();
        const syllables: string[] = [];

        for (let i = 0; i < normalized.length - 1; i++) {
            syllables.push(normalized.substring(i, i + 2));
            if (i < normalized.length - 2) {
                syllables.push(normalized.substring(i, i + 3));
            }
        }

        return [...new Set(syllables)]; // Remove duplicates
    }

    /**
     * Optional: Enrich results with external API
     */
    private async enrichWithExternalAPI(results: GeneratedName[]): Promise<void> {
        // Placeholder for external API integration
        // Example: Behind The Name API, Namsor API, etc.

        // For now, we'll use a mock implementation
        // In production, you'd call a real API here:
        /*
        const response = await firstValueFrom(
          this.httpService.get(`https://api.behindthename.com/lookup`, {
            params: { name: results[0].name, key: 'YOUR_API_KEY' }
          })
        );
        */

        // Just a placeholder - no actual API call yet
        return Promise.resolve();
    }

    /**
     * Validate if a name exists in our database
     */
    async validateName(name: string): Promise<boolean> {
        const normalized = name.trim();
        return this.UZBEK_NAMES_GIRL.includes(normalized) ||
            this.UZBEK_NAMES_BOY.includes(normalized);
    }

    /**
     * Get meaning for a specific name
     */
    async getNameMeaning(name: string): Promise<{ meaning: string; origin: string } | null> {
        return this.NAME_MEANINGS[name] || null;
    }
}
