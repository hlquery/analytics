const { DataTypes } = require('sequelize');

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.createTable('analytics_searches', {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      payloadId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'analytics_payloads', key: 'id' },
        onDelete: 'CASCADE',
      },
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
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('analytics_searches', ['createdAt']);
    await queryInterface.addIndex('analytics_searches', ['action']);
    await queryInterface.addIndex('analytics_searches', ['collection']);
    await queryInterface.addIndex('analytics_searches', ['requesterCountryIso']);
    await queryInterface.addIndex('analytics_searches', ['requesterUser']);
  },

  async down({ context: queryInterface }) {
    await queryInterface.dropTable('analytics_searches');
  },
};

