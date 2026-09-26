import React from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { Colors } from '../../constants/colors';
import { AppText } from '../ui/AppText';
import { DateEntry } from '../../types';
import { formatDateShort, format24to12 } from '../../utils/dateUtils';

interface DateCardProps {
  entry: DateEntry;
  index: number;
  onPress: () => void;
}

const STATUS_COLOR: Record<string, string> = {
  completed: Colors.sage,
  accepted: Colors.accent,
  proposed: Colors.muted,
  cancelled: Colors.light,
  cancelrequested: Colors.accent,
};

import api from '../../services/api';

export const DateCard: React.FC<DateCardProps> = ({ entry: d, index, onPress }) => {
  const getFullUrl = (url?: string) => url?.startsWith('/') ? `${api.defaults.baseURL?.replace('/api/v1', '')}${url}` : url;
  
  return (
  <Pressable style={styles.container} onPress={onPress}>
    <View style={styles.header}>
      <AppText variant="mono" color={Colors.light} style={{ fontSize: 9 }}>
        №{String(index + 1).padStart(2, '0')}
      </AppText>
      <AppText variant="mono" color={STATUS_COLOR[d.status]} style={{ fontSize: 10 }}>
        {d.status.toUpperCase()}
      </AppText>
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <View style={{ flex: 1 }}>
        <AppText variant="heading" size={22} style={{ marginBottom: 4, lineHeight: 26 }}>
          {d.title || d.venue}
        </AppText>
        <AppText variant="serifItalic" size={14} color={Colors.muted}>
          {d.title ? `${d.venue}` : ''}{d.title && d.date ? ` · ` : ''}{d.date ? `${formatDateShort(d.date)}` : ''}
          {d.exactTime ? ` · ${d.exactTime.includes('AM') || d.exactTime.includes('PM') ? d.exactTime : format24to12(d.exactTime)}` : ''}
        </AppText>
      </View>
      {d.averageRating !== undefined && (
        <View style={{ marginLeft: 10, alignItems: 'flex-end' }}>
          <AppText variant="mono" color={Colors.accent} style={{ fontSize: 11, marginTop: 4 }}>
            {'★'.repeat(Math.round(d.averageRating))}{'☆'.repeat(5 - Math.round(d.averageRating))}
          </AppText>
        </View>
      )}
    </View>
    {(() => {
      const validReviews = d.reviews?.filter(r => r.text && r.text.trim() !== "") || [];
      const legacyMemory = d.memory && d.memory.trim() !== "" ? d.memory : null;
      const allPhotos = d.reviews?.flatMap(r => r.photos || []) || [];
      const displayPhotos = allPhotos.slice(0, 3);
      
      const hasContent = validReviews.length > 0 || legacyMemory || displayPhotos.length > 0;
      
      if (!hasContent && !d.myPhoto && !d.partnerPhoto) return null;

      return (
        <View style={{ marginTop: 16 }}>
          {(validReviews.length > 0 || legacyMemory || displayPhotos.length > 0) && (
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <View style={{ flex: 1, gap: 8 }}>
                {validReviews.slice(0, 2).map((r: any, i: number) => (
                  <View key={i} style={styles.memory}>
                    <AppText variant="serifItalic" size={14} color={Colors.ink2} style={{ lineHeight: 22 }}>
                      "{r.text}"
                    </AppText>
                  </View>
                ))}
                {validReviews.length === 0 && legacyMemory && (
                  <View style={styles.memory}>
                    <AppText variant="serifItalic" size={14} color={Colors.ink2} style={{ lineHeight: 22 }}>
                      "{legacyMemory}"
                    </AppText>
                  </View>
                )}
              </View>

              {displayPhotos.length > 0 && (
                <View style={{ width: 80, gap: 8 }}>
                  {displayPhotos.map((photo, pIdx) => (
                    <Image 
                      key={pIdx} 
                      source={{ uri: getFullUrl(photo) }} 
                      style={{ width: '100%', height: 50, borderRadius: 8, backgroundColor: Colors.rule }} 
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {(d.myPhoto || d.partnerPhoto) && (
            <View style={{ flexDirection: 'row', paddingLeft: (validReviews.length > 0 || legacyMemory) ? 14 : 0 }}>
              {d.myPhoto && (
                <Image 
                  source={{ uri: getFullUrl(d.myPhoto) }} 
                  style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: Colors.bone }} 
                />
              )}
              {d.partnerPhoto && (
                <Image 
                  source={{ uri: getFullUrl(d.partnerPhoto) }} 
                  style={{ 
                    width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: Colors.bone, 
                    marginLeft: d.myPhoto ? -12 : 0 
                  }} 
                />
              )}
            </View>
          )}
        </View>
      );
    })()}
  </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  memory: {
    marginTop: 8,
    paddingLeft: 14,
    borderLeftWidth: 2,
    borderLeftColor: Colors.accent,
  },
});