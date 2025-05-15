import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

type StarRatingProps = {
  maxStars?: number;
  onRatingChange?: (rating: number) => void;
  initialRating?: number;
};

const StarRating: React.FC<StarRatingProps> = ({
  maxStars = 5,
  onRatingChange,
  initialRating = 0,
}) => {
  const [rating, setRating] = useState<number>(initialRating);

  const handlePress = (star: number) => {
    setRating(star);
    if (onRatingChange) {
      onRatingChange(star);
    }
  };

  const renderStars = () => {
    return Array.from({ length: maxStars }, (_, i) => (
      <TouchableOpacity key={i} onPress={() => handlePress(i + 1)}>
        <Icon
          name={i < rating ? 'star' : 'star-o'}
          size={32}
          color="#FFD700"
          style={styles.star}
        />
      </TouchableOpacity>
    ));
  };

  return <View style={styles.container}>{renderStars()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
  },
  star: {
    marginHorizontal: 5,
  },
});

export default StarRating;
