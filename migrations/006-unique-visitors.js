const { DataTypes } = require('sequelize');

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.createTable('analytics_unique_ips', {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      day: { type: DataTypes.DATEONLY, allowNull: false },
      requesterCountryIso: { type: DataTypes.STRING(8), allowNull: true },
      ipHash: { type: DataTypes.STRING(64), allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('analytics_unique_ips', ['day']);
    await queryInterface.addIndex('analytics_unique_ips', ['requesterCountryIso']);
    await queryInterface.addIndex('analytics_unique_ips', ['createdAt']);
    await queryInterface.addIndex('analytics_unique_ips', ['day', 'ipHash'], { unique: true });
  },

  async down({ context: queryInterface }) {
    await queryInterface.dropTable('analytics_unique_ips');
  },
};

