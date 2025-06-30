interface Config {
  API_BASE_URL: string;
}

const config: { [key: string]: Config } = {
  development: {
    API_BASE_URL: import.meta.env.VITE_APP_DEV_API_BASE_URL,
  },
  staging: {
    API_BASE_URL: import.meta.env.VITE_APP_DEV_API_BASE_URL, // adjust if different
  },
  production: {
    API_BASE_URL: import.meta.env.VITE_APP_PROD_API_BASE_URL,
  },
};

const currentEnv = import.meta.env.MODE || import.meta.env.VITE_APP_ENV || "development";

const urls = config[currentEnv] || config["development"];

export default urls;
