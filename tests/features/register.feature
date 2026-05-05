@regression
Feature: User registration
  Scenario: Register new user
    Given the user opens the home page
    When the user registers a new unique user
    Then the registration completion page should be shown

@sanity
Feature: Home page health
  Scenario: Home page loads successfully
    Given the user opens the home page
    Then the home page should be displayed
