import { Everli } from '../../src/libs/everli';

describe('Everli', () => {
  const email = process.env.EVERLI_EMAIL;
  const password = process.env.EVERLI_PASSWORD;

  describe('Constructor', () => {
    test('it should store credentials', () => {
      const everli = new Everli({ email, password });

      expect(everli).toHaveProperty('email', email);
      expect(everli).toHaveProperty('password', password);
    });

    test('it should throw error if no email', () => {
      expect(() => new Everli({ email: '', password }))
        .toThrowError('You must specify at least an email and a password');
    });

    test('it should throw error if no password', () => {
      expect(() => new Everli({ email, password: '' }))
        .toThrowError('You must specify at least an email and a password');
    });
  });

  describe('Instance', () => {
    let everli;

    beforeEach(() => {
      everli = new Everli({ email, password });
    });

    describe('Login', () => {
      test('it should login correctly', async () => {
        await expect(everli.login()).resolves.not.toBeDefined();

        expect(everli.id).toMatch(/^\d{10}$/);
        expect(everli.token).toMatch(/^\w{40}$/);
      }, 30000);

      test('it should not login correctly', async () => {
        everli = new Everli({ email, password: 'foo' });

        await expect(everli.login()).rejects.toThrowError('Wrong credentials');

        expect(everli.id).not.toBeDefined();
        expect(everli.token).not.toBeDefined();
      });
    });

    describe('Init', () => {
      test('it should init everything', async () => {
        await expect(everli.init()).resolves.not.toBeDefined();

        expect(everli.location).toMatch(/^\w{5}$/);
      });
    });

    describe('GetStores', () => {
      test('it should return the stores', async () => {
        await expect(everli.getStores()).resolves.toBeDefined();

        const stores = await everli.getStores();

        expect(stores).toBeInstanceOf(Array);
        expect(stores.length).toBeGreaterThan(0);
        expect(stores).toHaveProperty('0.id');
        expect(stores).toHaveProperty('0.name');
        expect(stores).toHaveProperty('0.image');
        expect(stores).toHaveProperty('0.color');
        expect(stores).toHaveProperty('0.type');
        expect(stores).toHaveProperty('0.address');
        expect(stores).toHaveProperty('0.province');
        expect(stores).toHaveProperty('0.isNew');
        expect(stores).toHaveProperty('0.city');
        expect(stores).toHaveProperty('0.postalCode');
        expect(stores).toHaveProperty('0.country');
        expect(stores).toHaveProperty('0.area');
      });
    });
  });
});
