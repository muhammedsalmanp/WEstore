
    document.addEventListener('DOMContentLoaded', function () {
        const cancelButtons = document.querySelectorAll('.cancel-button');

        cancelButtons.forEach(button => {
            button.addEventListener('click', function () {
                const productId = this.dataset.productId;
                const orderId = document.querySelector('#order-id').value;
                // Open the modal
                const cancelModal = new bootstrap.Modal(document.getElementById('cancelReasonModal'));
                cancelModal.show();

                document.getElementById('confirmCancelBtn').onclick = function () {
                    const reason = document.getElementById('cancelReasonTextarea').value;

                    if (!reason.trim()) {
                        Swal.fire('Error!', 'Please provide a reason for cancellation.', 'error');
                        return;
                    }

                    // Proceed with cancellation logic
                    fetch('/order/cancel', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ orderId, productId, reason })
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.message === 'Product cancelled successfully') {
                                Swal.fire('Cancelled!', 'Your product has been cancelled.', 'success');
                                location.reload();
                            } else {
                                Swal.fire('Error!', data.message, 'error');
                            }
                        })
                        .catch(error => {
                            console.error('Error:', error);
                            Swal.fire('Error!', 'An error occurred while cancelling the product.', 'error');
                        });

                    cancelModal.hide();
                };
            });
        });

        const returnButtons = document.querySelectorAll('.return-button');

        returnButtons.forEach(button => {
            button.addEventListener('click', function () {
                const productId = this.id.split('-')[2];
                const deliveredDateInput = '<%= order.expectedDeliveryDate %>';
                const deliveredDate = deliveredDateInput ? new Date(deliveredDateInput.value) : null;

                if (!deliveredDate) {
                    Swal.fire({
                        title: 'Error',
                        text: 'Delivery date not available.',
                        icon: 'error',
                        confirmButtonColor: '#3498db'
                    });
                    return;
                }

                const currentDate = new Date();
                const diffDays = Math.floor((currentDate - deliveredDate) / (1000 * 60 * 60 * 24));

                if (diffDays > 7) {
                    Swal.fire({
                        title: 'Return Not Allowed',
                        text: "You cannot return the product as it has been more than 7 days since delivery.",
                        icon: 'error',
                        confirmButtonColor: '#3498db'
                    });
                } else {
                    const returnModal = new bootstrap.Modal(document.getElementById('returnReasonModal'));
                    returnModal.show();

                    document.getElementById('confirmReturnBtn').onclick = function () {
                        const reason = document.getElementById('returnReasonTextarea').value;
                        const boxStatus = document.getElementById('boxStatusSelect').value;

                        if (!reason.trim()) {
                            Swal.fire('Error!', 'Please provide a reason for return.', 'error');
                            return;
                        }
                        if (!boxStatus) {
                            Swal.fire('Error!', 'Please select if the box was opened or not.', 'error');
                            return;
                        }

                        if (boxStatus === 'opened') {
                            Swal.fire({
                                title: 'Product Damage',
                                text: 'Is the product damaged?',
                                input: 'radio',
                                inputOptions: {
                                    'yes': 'Yes',
                                    'no': 'No'
                                },
                                inputValidator: (value) => {
                                    if (!value) {
                                        return 'Please select whether the product is damaged!';
                                    }
                                },
                                showCancelButton: true,
                                confirmButtonColor: '#3498db',
                                cancelButtonColor: '#d33',
                                confirmButtonText: 'Submit'
                            }).then((damageResult) => {
                                if (damageResult.isConfirmed) {
                                    const damageStatus = damageResult.value;
                                    handleProductReturn(productId, reason, boxStatus, damageStatus);
                                }
                            });
                        } else {
                            handleProductReturn(productId, reason, boxStatus, 'no');
                        }

                        returnModal.hide();
                    };
                }
            });
        });

        function handleProductReturn(productId, reason, boxStatus, damageStatus) {
            const orderId = '<%= order.orderId %>';

            fetch('/return-product', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    orderId,
                    productId,
                    reason,
                    boxStatus,
                    damageStatus
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire(
                            'Return Successful!',
                            `Your product return has been initiated.\nOur team will contact you shortly.\nReturn ID: ${data.returnId}\nExpected Return Amount: ${data.expectedReturnAmount}`,
                            'success'
                        );
                        location.reload();
                    } else {
                        Swal.fire(
                            'Return Failed',
                            data.message || 'There was an error processing your return.',
                            'error'
                        );
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    Swal.fire(
                        'Error',
                        'An error occurred while processing your return request. Please try again later.',
                        'error'
                    );
                });
        }
    });

    // Add event listener for "Continue Shipping" button
    document.querySelectorAll('.continue-shipping-button').forEach(button => {
        button.addEventListener('click', async (e) => {
            const productId = e.target.dataset.productId;
            const orderId = '<%= order.orderId %>'; // Ensure this is available in your template

            try {
                const response = await fetch('/order/continueShipping', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ orderId, productId })
                });

                const result = await response.json();

                if (response.ok) {
                    Swal.fire({
                        title: 'Success',
                        text: result.message,
                        icon: 'success',
                        confirmButtonText: 'OK'
                    }).then(() => {
                        // Optionally, refresh the page or update the UI here
                        location.reload(); // Reload the page to reflect changes
                    });
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: result.message,
                        icon: 'error',
                        confirmButtonText: 'OK'
                    });
                }
            } catch (error) {
                console.error('Error restoring product:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to restore product. Please try again later.',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        });
    });

    document.addEventListener("DOMContentLoaded", function() {
        const payNowButton = document.getElementById("payNowButton");
    
        if (payNowButton) {
            payNowButton.addEventListener("click", function() {
                Swal.fire({
                    title: 'Select Payment Method',
                    html: `
                        <select id="paymentMethodDropdown" style="width: 100%; padding: 10px; font-size: 1rem;">
                            <option value="wallet">Wallet</option>
                            <option value="cod">Cash on Delivery</option>
                            <option value="razorPay">Pay Online (Card/Net Banking/UPI)</option>
                        </select>
                    `,
                    showConfirmButton: true,
                    confirmButtonText: 'Proceed',
                    showCancelButton: true,
                    cancelButtonText: 'Cancel',
                    preConfirm: () => {
                        const paymentMethod = document.getElementById('paymentMethodDropdown').value;
                        return handlePayment(paymentMethod);
                    }
                });
            });
        }
    
        async function handlePayment(paymentMethod) {
            const orderId = '<%= order.orderId %>'; 
            const totalAmount = parseFloat("<%= order.totalAmount %>");

            if (paymentMethod === 'wallet') {
                const walletData = await fetch('/user/check-wallet-balance', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        amount: totalAmount,
                        orderId: orderId
                    })
                }).then(response => response.json());

                if (walletData.success) {
                    showPurchaseSuccessDialog(orderId);
                } else {
                    const shortfall = walletData.shortfall;
                    Swal.fire({
                        title: 'Insufficient Wallet Balance',
                        text: `You need to add ₹${shortfall} to complete this purchase.`,
                        icon: 'error',
                        showCancelButton: true,
                        confirmButtonText: 'Add Money',
                        cancelButtonText: 'Cancel'
                    }).then(result => {
                        if (result.isConfirmed) {
                            handlePayment('razorPay');
                        }
                    });
                }
            } else if (paymentMethod === 'cod') {
                processOrder('cod');
            } else if (paymentMethod === 'razorPay') {
                var options = {
                    key: "<%= process.env.RAZOR_PAY_KEY_ID %>",
                    amount: totalAmount * 100, 
                    currency: "INR",
                    name: "Order Payment",
                    description: "Payment for order",
                    handler: function (response) {
                        fetch("/user/verify-orderpayment", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                paymentId: response.razorpay_payment_id,
                                orderId: orderId
                            })
                        })
                        .then(response => response.json())
                        .then(verifyData => {
                            if (verifyData.success) {
                                showPurchaseSuccessDialog(orderId) ;
                            } else {
                                showPaymentFailedDialog();
                            }
                        })
                        .catch(showPaymentFailedDialog);
                    },
                    theme: {
                        color: "#3399cc"
                    }
                };
    
                var rzp1 = new Razorpay(options);
                rzp1.open();
            }
        }
    
        function processOrder(paymentMethod) {
            const orderId = '<%= order.orderId %>';
            fetch('/order/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    orderId: orderId,
                    paymentMethod: paymentMethod
                })
            }).then(response => {
                if (response.ok) {
                    showPurchaseSuccessDialog(orderId);
                } else {
                    showPaymentFailedDialog();
                }
            }).catch(showPaymentFailedDialog);
        }

        function showPurchaseSuccessDialog(orderId) {
            Swal.fire({
                title: 'Purchase Successful',
                html: `Your order has been placed successfully!<br>Your order ID is ${orderId}`,
                icon: 'success',
                showCancelButton: true,
                confirmButtonText: 'Continue Shopping',
                cancelButtonText: 'Show Order Details'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/allProducts';
                } else {
                    window.location.href = `/order/details/${orderId}`;
                }
            });
        }

        function showPaymentFailedDialog() {
            Swal.fire({
                title: 'Payment Failed',
                text: 'Unfortunately, your payment could not be processed. Please try again later or contact support.',
                icon: 'error',
                confirmButtonText: 'Retry Payment'
            }).then(() => {
                window.location.reload();
            });
        }
    });
