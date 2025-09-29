// src/admin/dto/dashboard.dto.ts
import {
  Expose,
  Transform,
  Type,
} from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  IsObject,
  IsUrl,
  Min,
  Max,
} from 'class-validator';
import { Role, DocumentType, Kinship } from '@prisma/client';

// ============ STATS & ANALYTICS ============
export class DashboardStatsDto {
  @Expose() @IsNumber() totalUsers: number;
  @Expose() @IsNumber() activeUsers: number;
  @Expose() @IsNumber() newUsersToday: number;
  @Expose() @IsNumber() revenue: number;
  @Expose() @IsNumber() pendingVerifications: number;
  @Expose() @IsNumber() completedVerifications: number;
  @Expose() @IsNumber() totalInstituts: number;
  @Expose() @IsNumber() averageRating: number;
  @Expose() @IsNumber() uptime: number;
  @Expose() @IsNumber() averageLoadTime: number;
  @Expose() @IsNumber() growthRate: number;
  @Expose() @IsNumber() conversionRate: number;
  @Expose() @IsString() averageSessionTime: string;
  @Expose() @IsNumber() pageViews: number;
  @Expose() @IsNumber() bounceRate: number;
}

export class UserAnalyticsDto {
  @Expose() @IsNumber() totalUsers: number;
  @Expose() @IsNumber() activeUsers: number;
  @Expose() @IsNumber() newUsersThisMonth: number;
  @Expose() @IsNumber() userGrowthRate: number;
  @Expose() @IsObject() usersByRole: Record<Role, number>;
  @Expose() @IsArray() usersByInstitut: Array<{ institut: string; count: number }>;
  @Expose() @IsArray() usersByCity: Array<{ city: string; count: number }>;
  @Expose() @IsArray() dailyRegistrations: Array<{ date: string; count: number }>;
  @Expose() @IsArray() monthlyActiveUsers: Array<{ month: string; count: number }>;
}

export class VerificationAnalyticsDto {
  @Expose() @IsNumber() totalSubmissions: number;
  @Expose() @IsNumber() pendingCount: number;
  @Expose() @IsNumber() approvedCount: number;
  @Expose() @IsNumber() rejectedCount: number;
  @Expose() @IsNumber() approvalRate: number;
  @Expose() @IsNumber() averageProcessingTime: number;
  @Expose() @IsObject() verificationsByType: Record<DocumentType, number>;
  @Expose() @IsArray() dailyVerifications: Array<{
    date: string;
    submitted: number;
    processed: number;
  }>;
}

export class HousingAnalyticsDto {
  @Expose() @IsNumber() totalRooms: number;
  @Expose() @IsNumber() occupiedRooms: number;
  @Expose() @IsNumber() freeRooms: number;
  @Expose() @IsNumber() averagePrice: number;
  @Expose() @IsNumber() averageRating: number;
  @Expose() @IsArray() roomsByType: Array<{ type: string; count: number }>;
  @Expose() @IsArray() roomsByLocation: Array<{
    location: string;
    count: number;
    lat: number;
    lng: number;
  }>;
  @Expose() @IsArray() priceDistribution: Array<{ range: string; count: number }>;
  @Expose() @IsArray() demandHotspots: Array<{
    lat: number;
    lng: number;
    intensity: number;
  }>;
}

// ============ SETTINGS ============
export class PrioritySettingsDto {
  @Expose() @IsNumber() @Min(0) @Max(1) distanceWeight: number;
  @Expose() @IsNumber() @Min(0) @Max(1) priceWeight: number;
  @Expose() @IsNumber() @Min(0) @Max(1) qualityWeight: number;
  @Expose() @IsNumber() @Min(1) @Max(50) maxDistanceKm: number;
  @Expose() @IsNumber() @Min(1) @Max(5) minQualityRating: number;
}

export class MapSettingsDto {
  @Expose() @IsNumber() @Min(1) @Max(20) defaultZoom: number;
  @Expose() @IsArray() defaultCenter: [number, number];
  @Expose() @IsNumber() @Min(10) @Max(100) clusterRadius: number;
  @Expose() @IsObject() markerColors: {
    @Expose() @IsUrl() occupied: string;
    @Expose() @IsUrl() free: string;
  };
  @Expose() @IsNumber() @Min(0) @Max(1) heatmapIntensity: number;
}

export class AlertSettingsDto {
  @Expose() @IsNumber() @Min(1) @Max(50) maxApplicantsThreshold: number;
  @Expose() @IsNumber() @Min(1) @Max(30) verificationDelayDays: number;
  @Expose() @IsNumber() @Min(1) @Max(5) lowRatingThreshold: number;
}

export class AdminSettingsDto {
  @Expose() @ValidateNested() @Type(() => PrioritySettingsDto) priority: PrioritySettingsDto;
  @Expose() @ValidateNested() @Type(() => MapSettingsDto) map: MapSettingsDto;
  @Expose() @ValidateNested() @Type(() => AlertSettingsDto) alerts: AlertSettingsDto;
}

// ============ ACTIVITY & VERIFICATION ============
export class ActivityItemDto {
  @Expose() @IsString() id: string;
  @Expose() @IsEnum(['user', 'verification', 'payment', 'alert', 'system']) type: string;
  @Expose() @IsString() action: string;
  @Expose() @IsString() user: string;
  @Expose() @IsOptional() @IsString() userId?: string;
  @Expose() @IsString() time: string;
  @Expose() @IsEnum(['success', 'warning', 'error', 'info']) status: string;
  @Expose() @IsOptional() @IsObject() metadata?: Record<string, any>;
}

export class VerificationItemDto {
  @Expose() @IsString() id: string;
  @Expose() @IsString() studentId: string;
  @Expose() @IsString() name: string;
  @Expose() @IsString() email: string;
  @Expose() @IsOptional() @IsString() institut: string;
  @Expose() @IsEnum(DocumentType) documentType: DocumentType;
  @Expose() @IsDateString() submittedAt: string;
  @Expose() @IsEnum(['PENDING', 'APPROVED', 'REJECTED']) status: string;
  @Expose() @IsOptional() @IsDateString() reviewedAt?: string;
  @Expose() @IsOptional() @IsString() reviewedBy?: string;
  @Expose() @IsOptional() @IsString() rejectionReason?: string;
  @Expose() @IsArray() @IsUrl({}, { each: true }) documentUrls: string[];
}

export class UserListItemDto {
  @Expose() @IsString() id: string;
  @Expose() @IsString() email: string;
  @Expose() @IsString() firstName: string;
  @Expose() @IsString() lastName: string;
  @Expose() @IsOptional() @IsString() phone: string;
  @Expose() @IsEnum(Role) role: Role;
  @Expose() @IsDateString() createdAt: string;
  @Expose() @IsOptional() @IsDateString() lastLogin?: string;
  @Expose() @IsBoolean() isActive: boolean;
  @Expose() @IsBoolean() isVerified: boolean;
  @Expose() @IsOptional() @IsString() institut?: string;
  @Expose() @IsOptional() @IsString() cityOfStudy?: string;
  @Expose() @IsOptional() @IsArray() parents?: Array<{
    kinship: Kinship;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  }>;
}

// ============ QUERY DTOS ============
export class DashboardQueryDto {
  @Expose() @IsOptional() @IsString() period?: '7d' | '30d' | '3m' | '1y' = '7d';
}

export class UserQueryDto {
  @Expose() @IsOptional() @IsString() search?: string;
  @Expose() @IsOptional() @IsEnum(Role) role?: Role;
  @Expose() @IsOptional() @IsString() institut?: string;
  @Expose() @IsOptional() @IsString() city?: string;
  @Expose() @IsOptional() @IsBoolean() @Transform(({ value }) => value === 'true') isVerified?: boolean;
  @Expose() @IsOptional() @IsNumber() @Transform(({ value }) => parseInt(value)) page?: number = 1;
  @Expose() @IsOptional() @IsNumber() @Transform(({ value }) => parseInt(value)) limit?: number = 20;
  @Expose() @IsOptional() @IsString() sortBy?: 'createdAt' | 'lastLogin' | 'firstName' | 'lastName' = 'createdAt';
  @Expose() @IsOptional() @IsString() sortOrder?: 'asc' | 'desc' = 'desc';
}

export class VerificationQueryDto {
  @Expose() @IsOptional() @IsEnum(['PENDING', 'APPROVED', 'REJECTED']) status?: string;
  @Expose() @IsOptional() @IsEnum(DocumentType) documentType?: DocumentType;
  @Expose() @IsOptional() @IsString() institut?: string;
  @Expose() @IsOptional() @IsNumber() @Transform(({ value }) => parseInt(value)) page?: number = 1;
  @Expose() @IsOptional() @IsNumber() @Transform(({ value }) => parseInt(value)) limit?: number = 20;
}

export class HousingQueryDto {
  @Expose() @IsOptional() @IsString() search?: string;
  @Expose() @IsOptional() @IsEnum(['occupied', 'free', 'all']) status?: string;
  @Expose() @IsOptional() @IsString() roomType?: string;
  @Expose() @IsOptional() @IsString() location?: string;
  @Expose() @IsOptional() @IsNumber() @Transform(({ value }) => parseInt(value)) minPrice?: number;
  @Expose() @IsOptional() @IsNumber() @Transform(({ value }) => parseInt(value)) maxPrice?: number;
  @Expose() @IsOptional() @IsNumber() @Transform(({ value }) => parseInt(value)) minRating?: number;
  @Expose() @IsOptional() @IsNumber() @Transform(({ value }) => parseInt(value)) page?: number = 1;
  @Expose() @IsOptional() @IsNumber() @Transform(({ value }) => parseInt(value)) limit?: number = 20;
}

export class VerificationActionDto {
  @Expose() @IsEnum(['approve', 'reject']) action: string;
  @Expose() @IsOptional() @IsString() rejectionReason?: string;
}

// ============ RESPONSE DTOS ============
export class PaginatedResponseDto<T> {
  @Expose() @IsArray() data: T[];
  @Expose() @IsNumber() total: number;
  @Expose() @IsNumber() page: number;
  @Expose() @IsNumber() limit: number;
  @Expose() @IsNumber() totalPages: number;
  @Expose() @IsBoolean() hasNext: boolean;
  @Expose() @IsBoolean() hasPrev: boolean;
}

// ============ ROOM DTOS ============
export class RoomDto {
  @Expose() @IsString() id: string;
  @Expose() @IsString() title: string;
  @Expose() @IsString() description: string;
  @Expose() @IsNumber() price: number;
  @Expose() @IsString() roomType: string;
  @Expose() @IsBoolean() isCertified: boolean;
  @Expose() @IsNumber() rating: number;
  @Expose() @IsArray() @IsUrl({}, { each: true }) images: string[];
  @Expose() @IsNumber() surface: number;
  @Expose() @IsString() location: string;
  @Expose() @IsNumber() lat: number;
  @Expose() @IsNumber() lng: number;
  @Expose() @IsOptional() occupant?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  @Expose() @IsArray() applicants: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
  @Expose() @IsEnum(['occupied', 'free']) status: string;
}
