interface Config {
  API_BASE_URL: string;
  SERVER_BASE_URL: string;
}

const config: { [key: string]: Config } = {
  development: {
    API_BASE_URL: "http://localhost:3000",
    SERVER_BASE_URL: "http://localhost:3000",
  },
  staging: {
    API_BASE_URL: "http://localhost:3000",
    SERVER_BASE_URL: "http://localhost:3000",
  },
  production: {
    API_BASE_URL: "http://172.105.61.224:3000",
    SERVER_BASE_URL: "http://localhost:3000",
  },
};

const currentEnv = import.meta.env.VITE_APP_ENV || process.env.NODE_ENV || "development";
const urls = config[currentEnv];
// const urls = config[process.env.REACT_APP_ENV ?? process.env.NODE_ENV ?? "development"];

export default urls;

// 12 - 200k
// 50 client - 10 shared
