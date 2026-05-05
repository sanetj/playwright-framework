@smoke @sanity
Feature: Product search
  Scenario: Search product returns results
    Given the user opens the home page
    When the user searches for a product
    Then search results should be displayed
