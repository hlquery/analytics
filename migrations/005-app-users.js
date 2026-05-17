const { DataTypes } = require('sequelize');

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.createTable('analytics_app_users', {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      username: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      passwordSalt: { type: DataTypes.STRING(64), allowNull: false },
      passwordHash: { type: DataTypes.STRING(256), allowNull: false },
      role: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'user' },
      createdAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.addIndex('analytics_app_users', ['username'], { unique: true });
    await queryInterface.addIndex('analytics_app_users', ['role']);
  },

  async down({ context: queryInterface }) {
    await queryInterface.dropTable('analytics_app_users');
  },
};

