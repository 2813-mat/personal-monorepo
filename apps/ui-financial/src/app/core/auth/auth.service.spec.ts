import { rolesFromPayload, canWriteFromRoles } from './auth.service';

describe('auth role helpers', () => {
  it('extracts realm roles from an access-token payload', () => {
    expect(rolesFromPayload({ realm_access: { roles: ['admin', 'x'] } })).toEqual(['admin', 'x']);
  });

  it('returns [] when there is no realm_access', () => {
    expect(rolesFromPayload({})).toEqual([]);
    expect(rolesFromPayload(null)).toEqual([]);
  });

  it('canWrite is true for admin or editor', () => {
    expect(canWriteFromRoles(['editor'])).toBe(true);
    expect(canWriteFromRoles(['admin'])).toBe(true);
    expect(canWriteFromRoles(['viewer'])).toBe(false);
  });
});
