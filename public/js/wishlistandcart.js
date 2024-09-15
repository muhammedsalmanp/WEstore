
  document.addEventListener("DOMContentLoaded", (event) => {
    
    // Wishlist functionality
    document.querySelectorAll(".wishlist-btn").forEach((button) => {
      button.addEventListener("click", function (e) {
        e.preventDefault();
        const productId = this.getAttribute("data-product-id");
        const isWished = this.classList.contains("wished");
        const url = isWished ? "/wishlist/remove" : "/wishlist/add";
        const confirmMessage = isWished
          ? "Do you want to remove this product from your wishlist?"
          : "Do you want to add this product to your wishlist?";

        // Show confirmation message with SweetAlert2
        Swal.fire({
          title: confirmMessage,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Yes",
          cancelButtonText: "No",
        }).then((result) => {
          if (result.isConfirmed) {
            // Send a request to add or remove the product to/from the wishlist
            fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ productId }),
            })
              .then((response) => response.json())
              .then((data) => {
                if (data.success) {
                  const heartIcon = this.querySelector("i.fi-rs-heart");
                  if (isWished) {
                    this.classList.remove("wished");
                    heartIcon.style.color = ""; // Remove heart icon color
                  } else {
                    this.classList.add("wished");
                    heartIcon.style.color = "red"; // Set heart icon color to red
                  }
                  Swal.fire({
                    title: "Success!",
                    text: data.message,
                    icon: "success",
                    confirmButtonText: "OK",
                  });
                } else {
                  Swal.fire({
                    title: "Error!",
                    text: "Please log in to perform this action.",
                    icon: "error",
                    showCancelButton: true,
                    confirmButtonText: "Login",
                    cancelButtonText: "Cancel",
                  }).then((result) => {
                    if (result.isConfirmed) {
                      window.location.href = "/login";
                    }
                  });
                }
              })
              .catch((error) => {
                console.error("Error:", error);
                Swal.fire({
                  title: "Error!",
                  text: "An error occurred",
                  icon: "error",
                  confirmButtonText: "OK",
                });
              });
          }
        });
      });
    });

    // Cart functionality
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    const outOfStockButtons = document.querySelectorAll('.out-of-stock-btn');
    const quantityInputs = document.querySelectorAll('.qty-val');
    
    addToCartButtons.forEach(button => {
      button.addEventListener('click', function(event) {
        event.preventDefault();
        const productId = this.getAttribute('data-product-id');

        Swal.fire({
          title: 'Add this item to your cart?',
          showCancelButton: true,
          confirmButtonText: 'Add to Cart',
          cancelButtonText: 'Cancel',
          icon: 'question'
        }).then((result) => {
          if (result.isConfirmed) {
            addToCart(productId, 1).then(() => {
              Swal.fire({
                title: 'Success!',
                text: 'Item added to your cart.',
                icon: 'success',
                showCancelButton: true,
                confirmButtonText: 'Go to Cart',
                cancelButtonText: 'Continue Shopping'
              }).then((result) => {
                if (result.isConfirmed) {
                  window.location.href = '/cart';
                }
              });
            }).catch((error) => {
              let errorMessage = 'There was an issue adding the item to your cart.';
              if (error === "User not logged in.") {
                errorMessage = 'You need to log in to add items to your cart.';
                Swal.fire({
                  title: 'Login Required',
                  text: errorMessage,
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonText: 'Login',
                  cancelButtonText: 'Cancel'
                }).then((result) => {
                  if (result.isConfirmed) {
                    window.location.href = '/login';  // Redirect to login page
                  }
                });
              } else if (error === "Product already in cart.") {
                errorMessage = 'This product is already in your cart.';
              } 
              if (error !== "User not logged in.") {
                Swal.fire({
                  title: 'Error!',
                  text: errorMessage,
                  icon: 'error'
                });
              }
            });
          }
        });
      });
    });

    outOfStockButtons.forEach(button => {
      button.addEventListener('click', function(event) {
        event.preventDefault();
        Swal.fire({
          title: 'Out of Stock',
          text: 'This product is currently out of stock.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      });
    });

    quantityInputs.forEach(input => {
      input.addEventListener('change', function() {
        const productId = this.getAttribute('data-product-id');
        const newQuantity = parseInt(this.value); 

        updateCart(productId, newQuantity);
      });
    });

    function updateCart(productId, newQuantity) {
      fetch('/cart/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productId, quantity: newQuantity })
      }).then(response => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error('Failed to update cart.');
        }
      }).then(data => {
        const subtotalElement = document.querySelector(`#subtotal-${productId}`);
        subtotalElement.innerText = `${(data.subtotal).toFixed(2)}`;
      }).catch(error => {
        console.error('Error updating cart:', error);
        Swal.fire({
          title: 'Error!',
          text: 'Failed to update cart.',
          icon: 'error'
        });
      });
    }

    function addToCart(productId, quantity) {
      return new Promise((resolve, reject) => {
        fetch("/cart/addToCart", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ productId, quantity })
        }).then(response => {
          if (response.status === 401) {
            reject("User not logged in.");
          } else if (response.ok) {
            resolve();
          } else {
            response.json().then(data => {
              reject(data.error);
            });
          }
        }).catch(error => {
          reject(error);
        });
      });
    }

  });
