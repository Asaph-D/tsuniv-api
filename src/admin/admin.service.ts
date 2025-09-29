import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SqliteService } from 'src/sqlite/sqlite.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { plainToInstance } from 'class-transformer';
import {
  DashboardStatsDto,
  ActivityItemDto,
  UserListItemDto,
  VerificationItemDto,
  UserAnalyticsDto,
  VerificationAnalyticsDto,
  PaginatedResponseDto,
  UserQueryDto,
  VerificationQueryDto,
  VerificationActionDto,
  DashboardQueryDto,
  AdminSettingsDto,
} from './dto/dashboard.dto';
import { Role, DocumentType } from '@prisma/client';

@Injectable()
export class AdminService {
  private supabase = this.supabaseService.getClient();

  constructor(
    private readonly sqlite: SqliteService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // ============ DASHBOARD STATS ============
  async getDashboardStats(period: string = '7d'): Promise<DashboardStatsDto> {
    const dateFrom = this.getDateFromPeriod(period);

    interface VerificationResult {
      isVerified: boolean;
    }

    interface InstitutResult {
      Institut: string;
    }

    const [
      totalUsersResult,
      activeUsersResult,
      newUsersResult,
      revenueResult,
      verificationsResult,
      institutsResult,
    ] = await Promise.all([
      this.supabase.from('User').select('id', { count: 'exact', head: true }).then(({ count }) => ({ count })),
      this.supabase.from('User').select('id', { count: 'exact', head: true }).gte('lastLogin', dateFrom.toISOString()).then(({ count }) => ({ count })),
      this.supabase.from('User').select('id', { count: 'exact', head: true }).gte('createdAt', new Date().toISOString().split('T')[0]).then(({ count }) => ({ count })),
      Promise.resolve({ data: null, count: 45678 }),
      this.supabase.from('StudentDocuments').select('isVerified'),
      this.supabase.from('Student').select('Institut').not('Institut', 'is', null),
    ]);

    const pendingVerifications = verificationsResult.data?.filter((v) => !v.isVerified).length || 0;
    const completedVerifications = verificationsResult.data?.filter((v) => v.isVerified).length || 0;
    const uniqueInstituts = new Set(institutsResult.data?.map((s) => s.Institut)).size;

    const stats = {
      totalUsers: totalUsersResult.count || 0,
      activeUsers: activeUsersResult.count || 0,
      newUsersToday: newUsersResult.count || 0,
      revenue: revenueResult.count || 0,
      pendingVerifications,
      completedVerifications,
      totalInstituts: uniqueInstituts,
      averageRating: 4.8,
      uptime: 98.7,
      averageLoadTime: 2.1,
      growthRate: 15.3,
      conversionRate: 23.4,
      averageSessionTime: '12.5min',
      pageViews: 234567,
      bounceRate: 18.2,
    };

    return plainToInstance(DashboardStatsDto, stats, {
      excludeExtraneousValues: true,
    });
  }

  // ============ SETTINGS MANAGEMENT ============
  async getSettings(): Promise<AdminSettingsDto> {
    const { data, error } = await this.supabaseService.getClient()
      .from('AdminSettings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = "Result contains 0 rows"
      throw new Error(`Erreur lors de la récupération des paramètres: ${error.message}`);
    }

    if (!data) {
      // Retourner les paramètres par défaut si aucun n'est enregistré
      return {
        priority: {
          distanceWeight: 0.4,
          priceWeight: 0.3,
          qualityWeight: 0.3,
          maxDistanceKm: 5,
          minQualityRating: 3.5,
        },
        map: {
          defaultZoom: 13,
          defaultCenter: [48.8566, 2.3522], // Paris
          clusterRadius: 50,
          markerColors: {
            occupied: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
            free: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
          },
          heatmapIntensity: 0.5,
        },
        alerts: {
          maxApplicantsThreshold: 5,
          verificationDelayDays: 7,
          lowRatingThreshold: 2.5,
        },
      };
    }

    return plainToInstance(AdminSettingsDto, data, {
      excludeExtraneousValues: true,
    });
  }

  async updateSettings(settingsDto: AdminSettingsDto): Promise<AdminSettingsDto> {
    const { data, error } = await this.supabaseService.getClient()
      .from('AdminSettings')
      .upsert(settingsDto)
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de la mise à jour des paramètres: ${error.message}`);
    }

    return plainToInstance(AdminSettingsDto, data, {
      excludeExtraneousValues: true,
    });
  }

  async getRecentActivities(limit: number = 20): Promise<ActivityItemDto[]> {
    interface UserActivity {
      id: string;
      firstName: string;
      lastName: string;
      createdAt: string;
      lastLogin: string;
    }

    interface VerificationActivity {
      id: string;
      isVerified: boolean;
      verifiedAt: string;
      Student: {
        User: {
          firstName: string;
          lastName: string;
        };
      };
    }

    const [userActivities, verificationActivities] = await Promise.all([
      this.supabase.from('User').select('id, firstName, lastName, createdAt, lastLogin').order('createdAt', { ascending: false }).limit(limit / 2),
      this.supabase.from('StudentDocuments').select(`
        id,
        isVerified,
        verifiedAt,
        Student!inner(
          User!inner(firstName, lastName)
        )
      `).order('verifiedAt', { ascending: false, nullsFirst: false }).limit(limit / 2),
    ]);

    const activities: ActivityItemDto[] = [];

    userActivities.data?.forEach((user) => {
      activities.push({
        id: user.id,
        type: 'user',
        action: 'Nouvel utilisateur inscrit',
        user: `${user.firstName} ${user.lastName}`,
        userId: user.id,
        time: this.getTimeAgo(user.createdAt),
        status: 'success',
      });
    });

    verificationActivities.data?.forEach((doc) => {
      const student = doc.Student?.[0];
      const user = student?.User?.[0];

      if (student && user && doc.isVerified && doc.verifiedAt) {
        activities.push({
          id: doc.id,
          type: 'verification',
          action: 'Document vérifié',
          user: `${user.firstName} ${user.lastName}`,
          time: this.getTimeAgo(doc.verifiedAt),
          status: 'success',
        });
      }
    });

    return activities
      .sort((a, b) => this.parseTimeAgo(a.time) - this.parseTimeAgo(b.time))
      .slice(0, limit)
      .map((activity) =>
        plainToInstance(ActivityItemDto, activity, {
          excludeExtraneousValues: true,
        }),
      );
  }

  // ============ USER MANAGEMENT ============
  async getUsers(query: UserQueryDto): Promise<PaginatedResponseDto<UserListItemDto>> {
    interface UserResult {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone: string;
      role: Role;
      createdAt: string;
      lastLogin: string;
      isActive: boolean;
      studentId: string;
      Student: {
        isVerified: boolean;
        Institut: string;
        cityOfStudy: string;
      } | null;
    }

    let supabaseQuery = this.supabase.from('User').select(`
      id,
      email,
      firstName,
      lastName,
      phone,
      role,
      createdAt,
      lastLogin,
      isActive,
      studentId,
      Student(
        isVerified,
        Institut,
        cityOfStudy
      )
    `, { count: 'exact' });

    if (query.search) {
      supabaseQuery = supabaseQuery.or(
        `firstName.ilike.%${query.search}%,lastName.ilike.%${query.search}%,email.ilike.%${query.search}%`,
      );
    }
    if (query.role) {
      supabaseQuery = supabaseQuery.eq('role', query.role);
    }
    if (query.isVerified !== undefined) {
      supabaseQuery = supabaseQuery.eq('Student.isVerified', query.isVerified);
    }

    const offset = (query.page - 1) * query.limit;
    supabaseQuery = supabaseQuery
      .range(offset, offset + query.limit - 1)
      .order(query.sortBy, { ascending: query.sortOrder === 'asc' });

    const { data, error, count } = await supabaseQuery;

    if (error) {
      throw new Error(`Erreur lors de la récupération des utilisateurs: ${error.message}`);
    }

    const users = data.map((user) => {
      const student = user.Student?.[0];

      return {
        ...user,
        isVerified: student?.isVerified || false,
        institut: student?.Institut,
        cityOfStudy: student?.cityOfStudy,
      };
    });

    const totalPages = Math.ceil(count / query.limit);

    return plainToInstance(
      PaginatedResponseDto<UserListItemDto>,
      {
        data: users.map((user) =>
          plainToInstance(UserListItemDto, user, {
            excludeExtraneousValues: true,
          }),
        ),
        total: count,
        page: query.page,
        limit: query.limit,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
      { excludeExtraneousValues: true },
    );
  }

  async getUserById(id: string): Promise<UserListItemDto> {
    interface UserResult {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone: string;
      role: Role;
      createdAt: string;
      lastLogin: string;
      isActive: boolean;
      Student: {
        isVerified: boolean;
        Institut: string;
        cityOfStudy: string;
      } | null;
    }

    const { data, error } = await this.supabase
      .from('User')
      .select(`
        id,
        email,
        firstName,
        lastName,
        phone,
        role,
        createdAt,
        lastLogin,
        isActive,
        Student(
          isVerified,
          Institut,
          cityOfStudy
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const student = data.Student?.[0];

    const user = {
      ...data,
      isVerified: student?.isVerified || false,
      institut: student?.Institut,
      cityOfStudy: student?.cityOfStudy,
    };

    return plainToInstance(UserListItemDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async updateUserStatus(userId: string, isActive: boolean, adminId: string) {
    const { error } = await this.supabase
      .from('User')
      .update({ isActive })
      .eq('id', userId);

    if (error) {
      throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
    }

    await this.logActivity({
      type: 'user',
      action: `Utilisateur ${isActive ? 'activé' : 'désactivé'}`,
      targetUserId: userId,
      adminId,
    });

    return { success: true, message: `Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès` };
  }

  async deleteUser(userId: string, adminId: string) {
    if (userId === adminId) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer votre propre compte');
    }

    const { error } = await this.supabase
      .from('User')
      .delete()
      .eq('id', userId);

    if (error) {
      throw new Error(`Erreur lors de la suppression: ${error.message}`);
    }

    await this.logActivity({
      type: 'user',
      action: 'Utilisateur supprimé',
      targetUserId: userId,
      adminId,
    });

    return { success: true, message: 'Utilisateur supprimé avec succès' };
  }

  // ============ VERIFICATION MANAGEMENT ============
  async getVerifications(query: VerificationQueryDto): Promise<PaginatedResponseDto<VerificationItemDto>> {
    interface StudentDocument {
      id: string;
      studentId: string;
      isVerified: boolean;
      verifiedAt: string | null;
      rejectionReason: string | null;
      identityPhotoUrl: string;
      identityDocUrl: string;
      Student: {
        typeDocument: DocumentType;
        Institut: string;
        User: {
          firstName: string;
          lastName: string;
          email: string;
        };
      };
    }

    let supabaseQuery = this.supabase.from('StudentDocuments').select(`
      id,
      studentId,
      isVerified,
      verifiedAt,
      rejectionReason,
      identityPhotoUrl,
      identityDocUrl,
      createdAt,
      Student!inner(
        typeDocument,
        Institut,
        User!inner(
          firstName,
          lastName,
          email
        )
      )
    `, { count: 'exact' });

    if (query.status) {
      if (query.status === 'PENDING') {
        supabaseQuery = supabaseQuery.eq('isVerified', false).is('verifiedAt', null);
      } else if (query.status === 'APPROVED') {
        supabaseQuery = supabaseQuery.eq('isVerified', true);
      } else if (query.status === 'REJECTED') {
        supabaseQuery = supabaseQuery.eq('isVerified', false).not('rejectionReason', 'is', null);
      }
    }
    if (query.documentType) {
      supabaseQuery = supabaseQuery.eq('Student.typeDocument', query.documentType);
    }

    const offset = (query.page - 1) * query.limit;
    supabaseQuery = supabaseQuery
      .range(offset, offset + query.limit - 1)
      .order('createdAt', { ascending: false });

    const { data, error, count } = await supabaseQuery;

    if (error) {
      throw new Error(`Erreur lors de la récupération des vérifications: ${error.message}`);
    }
      
    const verifications = data.map((doc) => {
      const student = doc.Student?.[0];   // <-- déplacer ici
      const user = student?.User?.[0];    // <-- et ici

      return {
        id: doc.id,
        studentId: doc.studentId,
        name: user ? `${user.firstName} ${user.lastName}` : 'N/A',
        email: user?.email || 'N/A',
        institut: student?.Institut,
        documentType: student?.typeDocument,
        submittedAt: doc.createdAt,
        status: doc.isVerified ? 'APPROVED' : doc.rejectionReason ? 'REJECTED' : 'PENDING',
        reviewedAt: doc.verifiedAt,
        rejectionReason: doc.rejectionReason,
        documentUrls: [doc.identityPhotoUrl, doc.identityDocUrl].filter(Boolean),
      };
    });

    const totalPages = Math.ceil(count / query.limit);

    return plainToInstance(
      PaginatedResponseDto<VerificationItemDto>,
      {
        data: verifications.map((verification) =>
          plainToInstance(VerificationItemDto, verification, {
            excludeExtraneousValues: true,
          }),
        ),
        total: count,
        page: query.page,
        limit: query.limit,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
      { excludeExtraneousValues: true },
    );
  }

  async processVerification(verificationId: string, actionDto: VerificationActionDto, adminId: string) {
    const isApproved = actionDto.action === 'approve';

    const updateData: any = {
      isVerified: isApproved,
      verifiedAt: new Date().toISOString(),
      reviewedBy: adminId,
    };

    if (!isApproved && actionDto.rejectionReason) {
      updateData.rejectionReason = actionDto.rejectionReason;
    }

    const { error } = await this.supabase
      .from('StudentDocuments')
      .update(updateData)
      .eq('id', verificationId);

    if (error) {
      throw new Error(`Erreur lors du traitement: ${error.message}`);
    }

    await this.logActivity({
      type: 'verification',
      action: `Document ${isApproved ? 'approuvé' : 'rejeté'}`,
      targetId: verificationId,
      adminId,
      metadata: { reason: actionDto.rejectionReason },
    });

    return {
      success: true,
      message: `Document ${isApproved ? 'approuvé' : 'rejeté'} avec succès`,
    };
  }

  // ============ HELPER METHODS ============
  private getDateFromPeriod(period: string): Date {
    const now = new Date();
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '3m':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  private getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    if (diffInMinutes < 1) return 'À l’instant';
    if (diffInMinutes < 60) return `${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}j`;
  }

  private parseTimeAgo(timeAgo: string): number {
    if (timeAgo === 'À l’instant') return 0;
    const match = timeAgo.match(/(\d+)([mhj])/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'm':
        return value;
      case 'h':
        return value * 60;
      case 'j':
        return value * 1440;
      default:
        return 0;
    }
  }

  private async logActivity(activity: {
    type: string;
    action: string;
    targetUserId?: string;
    targetId?: string;
    adminId: string;
    metadata?: any;
  }) {
    console.log('Admin Activity:', activity);
  }
}