'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Add timestamps to the 'applications' table
    await queryInterface.addColumn('applications', 'createdAt', {
      // Changed to allowNull: true initially since existing rows will be NULL
      allowNull: true, 
      type: Sequelize.DATE,
      // REMOVE: defaultValue: Sequelize.fn('datetime', 'now')
    });
    await queryInterface.addColumn('applications', 'updatedAt', {
      allowNull: true,
      type: Sequelize.DATE,
      // REMOVE: defaultValue: Sequelize.fn('datetime', 'now')
    });

    // 2. Add timestamps to the 'profile' table
    await queryInterface.addColumn('profile', 'createdAt', {
      allowNull: true,
      type: Sequelize.DATE,
      // REMOVE: defaultValue: Sequelize.fn('datetime', 'now')
    });
    await queryInterface.addColumn('profile', 'updatedAt', {
      allowNull: true,
      type: Sequelize.DATE,
      // REMOVE: defaultValue: Sequelize.fn('datetime', 'now')
    });
  },

  async down (queryInterface, Sequelize) {
    // 1. Remove timestamps from 'applications' table
    await queryInterface.removeColumn('applications', 'updatedAt');
    await queryInterface.removeColumn('applications', 'createdAt');

    // 2. Remove timestamps from 'profile' table
    await queryInterface.removeColumn('profile', 'updatedAt');
    await queryInterface.removeColumn('profile', 'createdAt');
  }
};