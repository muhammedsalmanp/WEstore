
async function submitReview() {
    const selectedStar = document.querySelector('.star.selected');
    if (!selectedStar) {
        alert('Please select a star rating');
        return;
    };
    const rating = selectedStar.getAttribute('data-value');
    const comment = document.getElementById('comment').value;
    const image = document.getElementById('image').files[0];
    const productId = 'YOUR_PRODUCT_ID'; // Set the product ID here
    const userId = 'YOUR_USER_ID'; // Set the user ID here

    const formData = new FormData();
    formData.append('rating', rating);
    formData.append('comment', comment);
    formData.append('image', image);
    formData.append('productId', productId);
    formData.append('userId', userId);

    const response = await fetch('/submitReview', {
        method: 'POST',
        body: formData,
    });

    if (response.ok) {
        loadReviews();
    } else {
        alert('Failed to submit review');
    }
}

async function loadReviews() {
    const response = await fetch('/submitReview');
    const reviews = await response.json();
    const reviewsDiv = document.getElementById('reviews');
    reviewsDiv.innerHTML = reviews.map(review => `
        <div class="review">
            <div>Rating: ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
            <div>${review.comment}</div>
            <div>By: ${review.username}</div>
            ${review.image ? `<img src="${review.image}" alt="Review Image">` : ''}
        </div>
    `).join('');
}

loadReviews();