@smoke @regression
Feature: Cart management
  Background:
    Given the user opens the home page
    And the user searches for a product
    And the user opens the first searched product

  Scenario: Add product to cart
    When the user adds the product to cart
    And the user opens the cart
    Then the cart should contain the searched product

  Scenario: Update cart item quantity
    When the user adds the product to cart
    And the user opens the cart
    And the user updates cart quantity to 3
    Then the cart item quantity should be 3

  Scenario: Remove item from cart
    When the user adds the product to cart
    And the user opens the cart
    And the user removes the searched product from cart
    Then the cart should not contain the searched product
