import { Injectable } from '@nestjs/common';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
}

@Injectable()
export class UsersService {
  private users: UserProfile[] = [];

  async createUserProfile(profile: UserProfile): Promise<UserProfile> {
    this.users.push(profile);
    return profile;
  }

  async getUserProfileById(id: string): Promise<UserProfile | undefined> {
    return this.users.find(u => u.id === id);
  }
}
