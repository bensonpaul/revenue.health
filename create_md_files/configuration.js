require('dotenv').config();
const context = process.env.CONTEXT;
let API_URL, BASE_URL, PROJECT_ID, CLEAN_URL_FIELD, AUTH_TOKEN;
    API_URL = process.env.API_URL;
    BASE_URL= process.env.BASE_URL;
    PROJECT_ID=process.env.PROJECT_ID;
    CLEAN_URL_FIELD=process.env.CLEAN_URL_FIELD;
    AUTH_TOKEN=process.env.AUTH_TOKEN;

const configuration = {
    apiUrl: API_URL,
    baseUrl: BASE_URL,
    projectId: PROJECT_ID,
    cleanUrlField: CLEAN_URL_FIELD,
    authToken: AUTH_TOKEN
};


module.exports = configuration;