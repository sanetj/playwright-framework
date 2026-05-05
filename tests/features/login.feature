@smoke @sanity
Feature: Login
  Scenario: Valid user login
    Given the user opens the home page
    When the user navigates to login
    And the user logs in with valid credentials
    Then the user should be logged in

  Scenario: Login page navigation
    Given the user opens the home page
    When the user navigates to login
    Then the login page should be displayed
