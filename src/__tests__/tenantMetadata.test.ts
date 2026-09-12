import { updateTenantMetadataAction } from '@/app/actions/tenant';

// Mock Supabase client to avoid real DB calls during tests
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error: null })
  })
}));

describe('updateTenantMetadataAction', () => {
  it('updates metadata successfully when colors are valid hex', async () => {
    const result = await updateTenantMetadataAction('test-tenant-123', {
      public_theme: {
        bgColor: '#ffffff',
        btnColor: '#ff0000'
      }
    }, null);
    
    expect(result.success).toBe(true);
  });

  it('fails when bgColor is not a valid hex', async () => {
    const result = await updateTenantMetadataAction('test-tenant-123', {
      public_theme: {
        bgColor: 'red',
        btnColor: '#ff0000'
      }
    }, null);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('valid hex');
  });

  it('fails when btnColor is not a valid hex', async () => {
    const result = await updateTenantMetadataAction('test-tenant-123', {
      public_theme: {
        bgColor: '#ffffff',
        btnColor: 'rgba(0,0,0,1)'
      }
    }, null);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('valid hex');
  });
});
