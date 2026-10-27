import bcrypt from 'bcryptjs';

export function createPasswordHasher({ rounds }) {
  // Used to keep login timing constant when the email does not exist (user enumeration defence).
  let dummyHash;

  return {
    hash: (plain) => bcrypt.hash(plain, rounds),

    async compare(plain, hash) {
      if (!hash) {
        dummyHash ??= await bcrypt.hash('timing-safe-dummy-password', rounds);
        await bcrypt.compare(plain, dummyHash);
        return false;
      }
      return bcrypt.compare(plain, hash);
    },
  };
}
