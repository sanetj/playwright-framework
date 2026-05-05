@regression
Feature: Checkout flow
  Scenario: Complete checkout successfully
    Given the user opens the home page
    And the user searches for a product
    And the user opens the first searched product
    And the user adds the product to cart
    And the user opens the cart
    When the user places an order
    Then the order completion page should be shown
