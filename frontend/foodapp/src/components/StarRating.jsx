import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";

const StarRating = ({ rating }) => {
  // Generate stars dynamically based on the rating value
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars.push(<FaStar key={i} className="text-yellow-400 " />);
    } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
      stars.push(<FaStarHalfAlt key={i} className="text-red-500" />);
    } else {
      stars.push(<FaRegStar key={i} className="text-red-400" />);
    }
  }

  return <div className="flex space-x-1 text-sm">{stars}</div>;
};

export default StarRating;
