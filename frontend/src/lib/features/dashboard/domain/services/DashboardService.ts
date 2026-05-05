import Network from '@/core/network';
import type { DashboardSnapshot } from '../../data/models/Dashboard';

interface ApiEnvelope<T> { data: T }

class DashboardService {
  static readonly instance = new DashboardService();
  private network = new Network();
  private constructor() {}

  async get(): Promise<DashboardSnapshot> {
    const res = await this.network.get<ApiEnvelope<DashboardSnapshot>>('/dashboard');
    return res.data;
  }
}

export default DashboardService.instance;
