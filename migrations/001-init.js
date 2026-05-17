const { DataTypes } = require('sequelize');

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.createTable('analytics_payloads', {
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
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('analytics_payloads', ['receivedAt']);
    await queryInterface.addIndex('analytics_payloads', ['payloadType']);

    await queryInterface.createTable('analytics_events', {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      payloadId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'analytics_payloads', key: 'id' },
        onDelete: 'CASCADE',
      },
      action: { type: DataTypes.STRING(64), allowNull: false },
      collection: { type: DataTypes.STRING(128), allowNull: false },
      requesterIp: { type: DataTypes.STRING(128), allowNull: true },
      requesterUser: { type: DataTypes.STRING(128), allowNull: true },
      requesterCountryIso: { type: DataTypes.STRING(8), allowNull: true },
      requesterCountryName: { type: DataTypes.STRING(128), allowNull: true },
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
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('analytics_events', ['createdAt']);
    await queryInterface.addIndex('analytics_events', ['action']);
    await queryInterface.addIndex('analytics_events', ['collection']);
    await queryInterface.addIndex('analytics_events', ['requesterCountryIso']);
  },

  async down({ context: queryInterface }) {
    await queryInterface.dropTable('analytics_events');
    await queryInterface.dropTable('analytics_payloads');
  },
};
