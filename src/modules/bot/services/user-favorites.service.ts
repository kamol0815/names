import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFavoriteNameEntity } from '../../../shared/database/entities/user-favorite-name.entity';
import { NameInsightsService, NameSuggestion } from './name-insights.service';

export interface FavoriteList {
  items: Array<{
    name: string;
    gender: string;
    meaning?: string;
    origin?: string;
    slug?: string;
  }>;
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}

@Injectable()
export class UserFavoritesService {
  constructor(
    @InjectRepository(UserFavoriteNameEntity)
    private readonly favoritesRepository: Repository<UserFavoriteNameEntity>,
    @Inject(forwardRef(() => NameInsightsService))
    private readonly insightsService: NameInsightsService,
  ) { }

  async toggleFavorite(userId: string, slug: string): Promise<'added' | 'removed'> {
    // Avval bazadan qidirish
    let record = this.insightsService.findRecordByName(slug);

    // Agar bazada yo'q bo'lsa, API dan so'rash
    if (!record) {
      const nameFromSlug = slug.charAt(0).toUpperCase() + slug.slice(1);
      const { record: apiRecord } = await this.insightsService.getRichNameMeaning(nameFromSlug);
      record = apiRecord;
    }

    // Hali ham topilmasa, minimal ism yaratish
    const finalName = record?.name || (slug.charAt(0).toUpperCase() + slug.slice(1));
    const finalGender = record?.gender || 'boy';
    const finalOrigin = record?.origin || 'Unknown';
    const finalMeaning = record?.meaning || "Ma'lumot topilmadi";

    const existing = await this.favoritesRepository.findOne({
      where: { userId, slug: slug },
    });

    if (existing) {
      await this.favoritesRepository.remove(existing);
      return 'removed';
    }

    const entity = this.favoritesRepository.create({
      userId,
      slug: slug,
      name: finalName,
      gender: finalGender,
      origin: finalOrigin,
      meaning: finalMeaning,
      metadata: {
        focusValues: record?.focusValues || [],
        trendIndex: record?.trendIndex?.monthly || 0,
      },
    });

    await this.favoritesRepository.save(entity);
    return 'added';
  }

  async listFavorites(
    userId: string,
    page = 1,
    pageSize = 6,
  ): Promise<FavoriteList> {
    const [items, total] = await this.favoritesRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: items.map((item) => ({
        name: item.name,
        gender: item.gender,
        meaning:
          item.meaning ?? this.insightsService.findRecordByName(item.slug)?.meaning,
        origin:
          item.origin ?? this.insightsService.findRecordByName(item.slug)?.origin,
        slug: item.slug,
      })),
      page,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      totalItems: total,
      pageSize,
    };
  }
}
