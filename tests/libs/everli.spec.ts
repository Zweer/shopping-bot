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

  test('Instance', async () => {
    const everli = new Everli({ email, password });

    await expect(everli.login()).resolves.not.toBeDefined();

    // @ts-ignore
    expect(everli.id).toMatch(/^\d{10}$/);
    // @ts-ignore
    expect(everli.token).toMatch(/^\w{40}$/);

    await expect(everli.init()).resolves.not.toBeDefined();

    // @ts-ignore
    expect(everli.location).toMatch(/^\w{5}$/);

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

    const store = stores[0];
    await expect(everli.getAvailability(store)).resolves.toBeDefined();

    const availability = await everli.getAvailability(store);
    expect(availability.length).toBeGreaterThan(0);
    expect(availability).toHaveProperty('0.date');
    expect(availability).toHaveProperty('0.slots');
    expect(availability).toHaveProperty('0.slots.0.time');
    expect(availability).toHaveProperty('0.slots.0.cost');
  });
});
