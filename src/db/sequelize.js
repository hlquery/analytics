const { Sequelize, DataTypes } = require('sequelize');

function buildSequelize() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
    return new Sequelize(process.env.DATABASE_URL.trim(), {
      dialect: 'mysql',
      logging: false,
    });
  }

  return new Sequelize(
    process.env.DB_NAME || 'hlquery_analytics',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      dialect: 'mysql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      logging: false,
    },
  );
}

const sequelize = buildSequelize();

const AnalyticsPayload = sequelize.define(
  'AnalyticsPayload',
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    service: { type: DataTypes.STRING(64), allowNull: false },
    path: { type: DataTypes.STRING(256), allowNull: false },
    receivedAt: { type: DataTypes.DATE, allowNull: false },
    remoteAddress: { type: DataTypes.STRING(128), allowNull: true },
    headersJson: { type: DataTypes.TEXT, allowNull: true },
    payloadType: { type: DataTypes.STRING(32), allowNull: true },
    usedDb: { type: DataTypes.STRING(64), allowNull: true },
    windowStartMs: { type: DataTypes.BIGINT, allowNull: true },
    windowEndMs: { type: DataTypes.BIGINT, allowNull: true },
    bucketCount: { type: DataTypes.INTEGER, allowNull: true },
    totalsJson: { type: DataTypes.TEXT, allowNull: true },
    rawPayloadJson: { type: DataTypes.TEXT, allowNull: false },
  },
  {
    tableName: 'analytics_payloads',
    timestamps: true,
    updatedAt: false,
  },
);

const AnalyticsEvent = sequelize.define(
  'AnalyticsEvent',
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    payloadId: { type: DataTypes.BIGINT, allowNull: false },
    action: { type: DataTypes.STRING(64), allowNull: false },
    collection: { type: DataTypes.STRING(128), allowNull: false },
    requesterIp: { type: DataTypes.STRING(128), allowNull: true },
    requesterUser: { type: DataTypes.STRING(128), allowNull: true },
    requesterCountryIso: { type: DataTypes.STRING(8), allowNull: true },
    requesterCountryName: { type: DataTypes.STRING(128), allowNull: true },
    requesterRegion: { type: DataTypes.STRING(64), allowNull: true },
    requesterCity: { type: DataTypes.STRING(128), allowNull: true },
    requesterLatitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    requesterLongitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    count: { type: DataTypes.BIGINT, allowNull: true },
    authenticatedCount: { type: DataTypes.BIGINT, allowNull: true },
    requestBytes: { type: DataTypes.BIGINT, allowNull: true },
    responseBytes: { type: DataTypes.BIGINT, allowNull: true },
    transferredBytes: { type: DataTypes.BIGINT, allowNull: true },
    status2xx: { type: DataTypes.BIGINT, allowNull: true },
    status4xx: { type: DataTypes.BIGINT, allowNull: true },
    status5xx: { type: DataTypes.BIGINT, allowNull: true },
    searchCount: { type: DataTypes.BIGINT, allowNull: true },
    clickCount: { type: DataTypes.BIGINT, allowNull: true },
    searchResultsFound: { type: DataTypes.BIGINT, allowNull: true },
    searchResultsReturned: { type: DataTypes.BIGINT, allowNull: true },
    searchTimeMs: { type: DataTypes.BIGINT, allowNull: true },
    clickRankSum: { type: DataTypes.BIGINT, allowNull: true },
  },
  {
    tableName: 'analytics_events',
    timestamps: true,
    updatedAt: false,
  },
);

const AnalyticsSearch = sequelize.define(
  'AnalyticsSearch',
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    payloadId: { type: DataTypes.BIGINT, allowNull: false },
    action: { type: DataTypes.STRING(64), allowNull: false },
    collection: { type: DataTypes.STRING(128), allowNull: false },
    query: { type: DataTypes.STRING(1024), allowNull: false },
    documentId: { type: DataTypes.STRING(256), allowNull: true },
    requesterIp: { type: DataTypes.STRING(128), allowNull: true },
    requesterUser: { type: DataTypes.STRING(128), allowNull: true },
    requesterCountryIso: { type: DataTypes.STRING(8), allowNull: true },
    requesterCountryName: { type: DataTypes.STRING(128), allowNull: true },
    requesterRegion: { type: DataTypes.STRING(64), allowNull: true },
    requesterCity: { type: DataTypes.STRING(128), allowNull: true },
    requesterLatitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    requesterLongitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    authenticated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    searchTimeMs: { type: DataTypes.BIGINT, allowNull: true },
    found: { type: DataTypes.BIGINT, allowNull: true },
    returned: { type: DataTypes.BIGINT, allowNull: true },
    documentCount: { type: DataTypes.BIGINT, allowNull: true },
  },
  {
    tableName: 'analytics_searches',
    timestamps: true,
    updatedAt: false,
  },
);

const AppUser = sequelize.define(
  'AppUser',
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    passwordSalt: { type: DataTypes.STRING(64), allowNull: false },
    passwordHash: { type: DataTypes.STRING(256), allowNull: false },
    role: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'user' },
  },
  {
    tableName: 'analytics_app_users',
    timestamps: true,
    updatedAt: false,
  },
);

const DimCountry = sequelize.define(
  'DimCountry',
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    iso: { type: DataTypes.STRING(8), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(128), allowNull: true },
  },
  {
    tableName: 'analytics_dim_countries',
    timestamps: true,
    updatedAt: false,
  },
);

const DimCollection = sequelize.define(
  'DimCollection',
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(128), allowNull: false, unique: true },
  },
  {
    tableName: 'analytics_dim_collections',
    timestamps: true,
    updatedAt: false,
  },
);

const DimAction = sequelize.define(
  'DimAction',
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  },
  {
    tableName: 'analytics_dim_actions',
    timestamps: true,
    updatedAt: false,
  },
);

const CountryDaily = sequelize.define(
  'CountryDaily',
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    day: { type: DataTypes.DATEONLY, allowNull: false },
    countryIso: { type: DataTypes.STRING(8), allowNull: false },
    events: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    searches: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    clicks: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: 'analytics_rollup_country_daily',
    timestamps: true,
    updatedAt: false,
  },
);

const CollectionDaily = sequelize.define(
  'CollectionDaily',
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    day: { type: DataTypes.DATEONLY, allowNull: false },
    collection: { type: DataTypes.STRING(128), allowNull: false },
    events: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    searches: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    clicks: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: 'analytics_rollup_collection_daily',
    timestamps: true,
    updatedAt: false,
  },
);

const UniqueIp = sequelize.define(
  'UniqueIp',
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    day: { type: DataTypes.DATEONLY, allowNull: false },
    requesterCountryIso: { type: DataTypes.STRING(8), allowNull: true },
    ipHash: { type: DataTypes.STRING(64), allowNull: false },
  },
  {
    tableName: 'analytics_unique_ips',
    timestamps: true,
    updatedAt: false,
  },
);

AnalyticsPayload.hasMany(AnalyticsEvent, { foreignKey: 'payloadId' });
AnalyticsEvent.belongsTo(AnalyticsPayload, { foreignKey: 'payloadId' });
AnalyticsPayload.hasMany(AnalyticsSearch, { foreignKey: 'payloadId' });
AnalyticsSearch.belongsTo(AnalyticsPayload, { foreignKey: 'payloadId' });

module.exports = {
  sequelize,
  AnalyticsPayload,
  AnalyticsEvent,
  AnalyticsSearch,
  AppUser,
  DimCountry,
  DimCollection,
  DimAction,
  CountryDaily,
  CollectionDaily,
  UniqueIp,
};
