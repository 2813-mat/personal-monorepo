import { rolesFromPayload, canWriteFromRoles, isAdminFromRoles } from './auth.service';

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

describe('isAdminFromRoles', () => {
  it('is true only for admin', () => {
    expect(isAdminFromRoles(['admin'])).toBe(true);
  });

  it('is false for editor, who can write but not close periods', () => {
    expect(isAdminFromRoles(['editor'])).toBe(false);
    expect(canWriteFromRoles(['editor'])).toBe(true);
  });

  it('is false for viewer and for no roles at all', () => {
    expect(isAdminFromRoles(['viewer'])).toBe(false);
    expect(isAdminFromRoles([])).toBe(false);
  });
});
