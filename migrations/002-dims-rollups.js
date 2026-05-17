const { DataTypes } = require('sequelize');

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.createTable('analytics_dim_countries', {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      iso: { type: DataTypes.STRING(8), allowNull: false },
      name: { type: DataTypes.STRING(128), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('analytics_dim_countries', ['iso'], { unique: true });

    await queryInterface.createTable('analytics_dim_collections', {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(128), allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('analytics_dim_collections', ['name'], { unique: true });

    await queryInterface.createTable('analytics_dim_actions', {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(64), allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('analytics_dim_actions', ['name'], { unique: true });

    await queryInterface.createTable('analytics_rollup_country_daily', {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      day: { type: DataTypes.DATEONLY, allowNull: false },
      countryIso: { type: DataTypes.STRING(8), allowNull: false },
      events: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      searches: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      clicks: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('analytics_rollup_country_daily', ['day', 'countryIso'], { unique: true });

    await queryInterface.createTable('analytics_rollup_collection_daily', {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      day: { type: DataTypes.DATEONLY, allowNull: false },
      collection: { type: DataTypes.STRING(128), allowNull: false },
      events: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      searches: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      clicks: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('analytics_rollup_collection_daily', ['day', 'collection'], { unique: true });
  },

  async down({ context: queryInterface }) {
    await queryInterface.dropTable('analytics_rollup_collection_daily');
    await queryInterface.dropTable('analytics_rollup_country_daily');
    await queryInterface.dropTable('analytics_dim_actions');
    await queryInterface.dropTable('analytics_dim_collections');
    await queryInterface.dropTable('analytics_dim_countries');
  },
};

