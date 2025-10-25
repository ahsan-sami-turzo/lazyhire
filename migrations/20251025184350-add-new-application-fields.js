'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // The 'up' function applies the changes (adds the columns)
  async up (queryInterface, Sequelize) {
    // Column 1: application_url
    await queryInterface.addColumn('applications', 'application_url', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    
    // Column 2: contact_name
    await queryInterface.addColumn('applications', 'contact_name', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    
    // Column 3: contact_phone
    await queryInterface.addColumn('applications', 'contact_phone', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    
    // Column 4: contact_email
    await queryInterface.addColumn('applications', 'contact_email', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    
    // Column 5: cv_created (for profile status)
    await queryInterface.addColumn('applications', 'cv_created', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    
    // Column 6: cover_letter_created (for profile status)
    await queryInterface.addColumn('applications', 'cover_letter_created', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  // The 'down' function reverts the changes (removes the columns)
  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('applications', 'application_url');
    await queryInterface.removeColumn('applications', 'contact_name');
    await queryInterface.removeColumn('applications', 'contact_phone');
    await queryInterface.removeColumn('applications', 'contact_email');
    await queryInterface.removeColumn('applications', 'cv_created');
    await queryInterface.removeColumn('applications', 'cover_letter_created');
  }
};