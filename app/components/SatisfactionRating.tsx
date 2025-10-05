import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

type SatisfactionRatingProps = {
  maxRating?: number;
  onRatingChange?: (rating: number) => void;
  initialRating?: number;
};

const SatisfactionRating: React.FC<SatisfactionRatingProps> = ({
  maxRating = 5,
  onRatingChange,
  initialRating = 0,
}) => {
  const [rating, setRating] = useState<number>(initialRating);

  const handlePress = (selectedRating: number) => {
    setRating(selectedRating);
    if (onRatingChange) {
      onRatingChange(selectedRating);
    }
  };

  const renderFaces = () => {
    return Array.from({ length: maxRating }, (_, i) => {
      const ratingLevel = i + 1;
      const isSelected = ratingLevel === rating;
      
      // Choose smiley face based on rating level
      let iconName = 'meh-o'; // Default neutral face
      let iconColor = '#9CA3AF'; // Default gray color
      
      if (isSelected) {
        switch (ratingLevel) {
          case 1:
            iconName = 'frown-o';
            iconColor = '#EF4444'; // Red for very sad
            break;
          case 2:
            iconName = 'frown-o';
            iconColor = '#F97316'; // Orange for sad
            break;
          case 3:
            iconName = 'meh-o';
            iconColor = '#EAB308'; // Yellow for neutral
            break;
          case 4:
            iconName = 'smile-o';
            iconColor = '#22C55E'; // Green for happy
            break;
          case 5:
            iconName = 'smile-o';
            iconColor = '#3B82F6'; // Blue for very happy
            break;
        }
      }
      
      return (
        <TouchableOpacity key={i} onPress={() => handlePress(ratingLevel)}>
          <Icon
            name={iconName}
            size={32}
            color={iconColor}
            style={styles.face}
          />
        </TouchableOpacity>
      );
    });
  };

  return <View style={styles.container}>{renderFaces()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
  },
  face: {
    marginHorizontal: 5,
  },
});

export default SatisfactionRating;
