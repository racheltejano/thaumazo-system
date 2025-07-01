import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseController } from './supabase.controller';

describe('SupabaseController', () => {
  let controller: SupabaseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupabaseController],
    }).compile();

    controller = module.get<SupabaseController>(SupabaseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
