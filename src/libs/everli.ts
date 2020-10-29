import axios, { AxiosInstance } from 'axios';

export type EverliOptions = {
  email: string;
  password: string;
};

type EverliResponse = {
  data: object;
  metadata: { data: string; };
};

export type EverliStore = {
  id: string;
  locationId: string;
  name: string;
  image: string;
  color: string;
  type: number;
  address: string;
  province: string;
  isNew: number;
  city: string;
  postalCode: string;
  country: string;
  area: string;
};

export type EverliAvailability = {
  date: string;
  slots: {
    time: string;
    cost: number;
  }[];
};

export class Everli {
  private readonly email: string;
  private readonly password: string;
  private token: string;
  private location: string;

  static readonly BASE_URL: string = 'https://api.everli.com';

  static readonly API_PATH_SIGNIN: string = '/user/api/v4/local/signin';
  static readonly API_PATH_INIT: string = '/sm/api/v3/init';
  static readonly API_PATH_STORES: string = '/sm/api/v3/locations/{LOCATION}/stores';
  static readonly API_PATH_AVAILABILITY: string = '/sm/api/v3/locations/{LOCATION}/stores/{STORE}/availability';

  private readonly request: AxiosInstance;

  constructor(options: EverliOptions) {
    if (!options.email || !options.password) {
      throw new Error('You must specify at least an email and a password');
    }

    this.email = options.email;
    this.password = options.password;

    this.request = axios.create({
      baseURL: Everli.BASE_URL,
    });
    this.request.interceptors.request.use((config) => {
      if (this.token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${this.token}`;
      }

      return config;
    });
  }

  async login(): Promise<void> {
    if (this.token) {
      return;
    }

    type LoginResponse = EverliResponse & {
      data: {
        user: {
          user_id: string; // "0002037944"
          email: string;
          country: string; // "ITA"
          auth_token: string;
        };
        tracking: {
          event_name: 'signin';
          data: {
            user_email: string;
            user_id: string;
            type: 'email';
          };
        }[];
        next_link: string;
      };
    };

    const { data } = await this.request.post<LoginResponse>(Everli.API_PATH_SIGNIN, {
      email: this.email,
      password: this.password,
      trackfrom: 'it-header',
    })
      .catch((error) => {
        console.log(error.response.data.error);
        throw new Error('Wrong credentials');
      });

    this.token = data.data.user.auth_token;
  }

  async init(): Promise<void> {
    await this.login();

    if (this.location) {
      return;
    }

    type InitResponse = EverliResponse & {
      data: {
        app: object,
        customer: {
          is_logged_in: boolean;
          has_valid_addresses: boolean;
          first_name: string;
          last_name: string;
          full_name: string;
          email: string;
        },
        country_data: object,
        use_legacy_brand: boolean;
        next_link: string; // "#/locations/11392/stores"
      };
    };

    const { data } = await this.request.get<InitResponse>(Everli.API_PATH_INIT);
    const match = data.data.next_link.match(/#\/locations\/(\d+)\/stores/);

    if (!match) {
      throw new Error('Wrong "next_link" in initialization phase');
    }

    this.location = match[1];
  }

  async getStores(location?: string): Promise<EverliStore[]> {
    location ? await this.login() : await this.init();

    type GetStoresResponse = EverliResponse & {
      data: {
        sticky: object;
        website_header: object;
        body: {
          widget_type: string;
          layout: string;
          title: string;
          description: string;
          list: {
            widget_type: string; // "store",
            id: string; // "3193",
            name: string; // "Coop",
            image: string; // "https://d2m46sh0bejigh.cloudfront.net/asset/gdo/coop-lombardia/logo-postal-code@2x.png",
            link: string; // "#/locations/11392/stores/3193",
            button_availability: string; // "Availability hours",
            button_available_hours: string; // "Availability hours",
            link_availability: string; // "#/locations/11392/stores/3193/availability?funnel=POSTAL_CODE_POPUP",
            funnel_availability: string; // "POSTAL_CODE_POPUP",
            label: {
              value: string; // "Stessi prezzi del punto vendita",
              color_name: null,
              color: string; // "#7ed321",
              link: null,
              attributes: []
            }[];
            widget_id: string; // "46541804020e0a954c44f50117fbd39c",
            tracking: {
              event_name: 'select_store';
              data: {
                location_id: string; // "11392",
                location_province: string; // "MI",
                location_operating_province: string; // "MI",
                location_postal_code: string; // "20143",
                location_country: string; // "ITA",
                location_area: string; // "MI6",
                store_store_id: string; // "3193",
                store_location_id: string; // "11392",
                store_type: number; // 14,
                store_brand: string; // "",
                store_name: string; // "coop",
                store_address: string; // "piazza fratelli cervi 11",
                store_province: string; // "MI",
                store_label_text: string; // "Stessi prezzi del punto vendita",
                store_new_flag: number; // 0,
                store_city: string; // "corsico",
                store_postal_code: string; // "20094",
                store_country: string; // "ITA",
                store_area: string; // "MI6"
              }
            }[];
          }[];
        }[];
        footer: object;
      }
    };

    const { data } = await this.request.get<GetStoresResponse>(Everli.API_PATH_STORES.replace('{LOCATION}', location || this.location));

    return data.data.body.map(storeGroups => storeGroups.list.map(store => ({
      id: store.id,
      locationId: store.tracking?.[0].data.location_id,
      name: store.name,
      image: store.image,
      color: store.label?.[0].color,
      type: store.tracking?.[0].data.store_type,
      address: store.tracking?.[0].data.store_address,
      province: store.tracking?.[0].data.store_province,
      isNew: store.tracking?.[0].data.store_new_flag,
      city: store.tracking?.[0].data.store_city,
      postalCode: store.tracking?.[0].data.store_postal_code,
      country: store.tracking?.[0].data.store_country,
      area: store.tracking?.[0].data.store_area,
    }))).flat();
  }

  async getAvailability(store: EverliStore): Promise<EverliAvailability[]> {
    await this.login();

    type GetAvailabilityResponse = EverliResponse & {
      data: {
        store_name: string;
        title: string;
        data: {
          label: string; // "Tomorrow 30 October",
          week_day: string; // "Tomorrow",
          day: string; // "30 Oct.",
          date: string; // "2020-10-30",
          hours: {
            label: string; // "Tomorrow, 09:00 - 10:00",
            time_label: string; // "09:00 - 10:00",
            price: string; // "4,90 €",
            badge: null; // null,
            valid: boolean; // true,
            time: string; // "09:00:00",
            cost: number; // 4.9,
            variation: number; // 0,
            tracking: {
              event_name: "checkout_delivery_slot",
              data: {
                delivery_slot: string; // "2020-10-30 09:00:00",
                cost: number; // 4.9,
                variation: number; // 0,
                currency: string; // "EUR"
              }
            }[];
          }[];
        }[];
        tracking: {
          event_name: "store_availability",
          data: {
            location_id: string; // "11392",
            location_province: string; // "MI",
            location_operating_province: string; // "MI",
            location_postal_code: string; // "20143",
            location_country: string; // "ITA",
            location_area: string; // "MI6",
            store_type: number; // 14,
            store_brand: string; // "",
            store_name: string; // "coop",
            store_address: string; // "piazza fratelli cervi 11",
            store_city: string; // "corsico",
            store_province: string; // "MI",
            store_postal_code: string; // "20094",
            store_country: string; // "ITA",
            store_label_text: string; // "Stessi prezzi del punto vendita",
            store_new_flag: number; // 0,
            store_store_id: string; // "3193",
            store_location_id: string; // "11392",
            store_area: string; // "MI6"
          };
        }[];
      };
    };

    const { data } = await this.request.get<GetAvailabilityResponse>(Everli.API_PATH_AVAILABILITY
      .replace('{LOCATION}', store.locationId)
      .replace('{STORE}', store.id));

    return data.data.data.map(day => ({
      date: day.date,
      slots: day.hours
        .filter(hour => hour.valid)
        .map(hour => ({
          time: hour.time,
          cost: hour.cost,
        })),
    }));
  }
}
