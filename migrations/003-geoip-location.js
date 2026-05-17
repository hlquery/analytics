const { DataTypes } = require('sequelize');

module.exports = {
  async up({ context: queryInterface }) {
    await queryInterface.addColumn('analytics_events', 'requesterRegion', {
      type: DataTypes.STRING(64),
      allowNull: true,
    });

    await queryInterface.addColumn('analytics_events', 'requesterCity', {
      type: DataTypes.STRING(128),
      allowNull: true,
    });

    await queryInterface.addColumn('analytics_events', 'requesterLatitude', {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    });

    await queryInterface.addColumn('analytics_events', 'requesterLongitude', {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    });
  },

  async down({ context: queryInterface }) {
    await queryInterface.removeColumn('analytics_events', 'requesterLongitude');
    await queryInterface.removeColumn('analytics_events', 'requesterLatitude');
    await queryInterface.removeColumn('analytics_events', 'requesterCity');
    await queryInterface.removeColumn('analytics_events', 'requesterRegion');
  },
};

