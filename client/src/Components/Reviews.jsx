const reviews = [
  {
    name: "Danica Flores",
    location: "Manila, PH",
    rating: 5,
    comment: "Vortex Elite is amazing! The cleaning crew arrived on time and did an incredible job. My house has never looked this clean. Highly recommended!",
    service: "Cleaning",
    avatar: "MS"
  },
  {
    name: "Joanna Montanez",
    location: "Quezon City, PH",
    rating: 5,
    comment: "Had a plumbing emergency late at night and they sent someone within the hour. Very professional and fixed the issue quickly. Will definitely use again!",
    service: "Plumbing",
    avatar: "JR"
  },
  {
    name: "Manny John Paul Vargas",
    location: "Makati, PH",
    rating: 5,
    comment: "The electrician was very knowledgeable and explained everything clearly. Fair pricing and excellent work. Vortex Elite is now my go-to for home services!",
    service: "Electrical",
    avatar: "AC"
  },
  {
    name: "Ahron Gainsan",
    location: "Pasig, PH",
    rating: 5,
    comment: "Needed some carpentry work done and the tasker exceeded my expectations. Beautiful craftsmanship and very friendly. 10/10 experience!",
    service: "Carpentry",
    avatar: "CM"
  },
]

function Reviews() {
  return (
    <div className="py-16 px-8 bg-gray-50">

      
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
        What Our Customers Say
      </h2>
      <p className="text-center text-gray-500 mb-12">
        Trusted by thousands of happy homeowners
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {reviews.map((review, index) => (
          <div key={index} className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow">
            
       
            <div className="flex gap-1 mb-3">
              {[...Array(review.rating)].map((_, i) => (
                <span key={i} className="text-yellow-400 text-lg">★</span>
              ))}
            </div>

         
            <p className="text-gray-600 text-sm mb-4">"{review.comment}"</p>

      
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">
              {review.service}
            </span>

           
            <div className="flex items-center gap-3 mt-4">
              <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                {review.avatar}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{review.name}</p>
                <p className="text-gray-400 text-xs">{review.location}</p>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  )
}

export default Reviews