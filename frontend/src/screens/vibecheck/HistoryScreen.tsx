import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { AppText } from '../../components/ui/AppText';
import { AppButton } from '../../components/ui/AppButton';
import { Tag } from '../../components/ui/Tag';
import SamVibeNav from '@/components/ui/SamVibeNav';

import { getVibeCardHistory, getVibeProfile } from '../../services/vibeCheckApi';
import { useFocusEffect } from '@react-navigation/native';

export const HistoryScreen: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [filter, setFilter] = useState<'All' | 'Matched' | 'Differed'>('All');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [partnerId, setPartnerId] = useState<string | null>(null);

  // SamVibeNav will fire onPartnerChange on mount if there are active connections
  // which will set partnerId and trigger the loadHistory effect.

  const loadHistory = async (pageNum = 1, append = false, currentPartnerId: string | null) => {
    if (!currentPartnerId) {
       setLoading(false);
       return;
    }
    setLoading(true);
    try {
      const res = await getVibeCardHistory(currentPartnerId, filter, pageNum, 10);
      if (res?.data) {
        if (append) {
          setHistory(prev => [...prev, ...res.data]);
        } else {
          setHistory(res.data);
        }
        setHasMore(res.data.length === 10);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setPage(1);
      loadHistory(1, false, partnerId);
    }, [filter, partnerId])
  );

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadHistory(nextPage, true, partnerId);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <SamVibeNav onPartnerChange={(pid) => setPartnerId(pid)} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          <AppText variant="display" size={42} style={{ lineHeight: 42, marginBottom: 6 }}>
            History<AppText size={42} color={Colors.accent}>.</AppText>
          </AppText>
          <AppText variant="serifItalic" size={16} color={Colors.muted} style={{ lineHeight: 24, marginBottom: 20 }}>
            Every card you've played together.
          </AppText>

          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 22 }}>
            <Tag active={filter === 'All'} onPress={() => setFilter('All')}>All</Tag>
            <Tag active={filter === 'Matched'} onPress={() => setFilter('Matched')}>Matched</Tag>
            <Tag active={filter === 'Differed'} onPress={() => setFilter('Differed')}>Differed</Tag>
          </View>

          {history.length === 0 && !loading && (
             <AppText variant="serifItalic" size={15} color={Colors.muted} style={{ textAlign: 'center', marginTop: 40 }}>
                No history found.
             </AppText>
          )}

          {history.map((h, i) => {
            const matched = h.is_match;
            return (
              <View key={i} style={styles.card}>
                <View style={styles.cardHeader}>
                  <AppText variant="smallCaps" color={Colors.muted}>{h.category}</AppText>
                  <AppText variant="mono" color={matched ? Colors.sage : Colors.accent} style={{ fontSize: 10 }}>
                    {matched ? '● MATCH' : '● DIFFER'}
                  </AppText>
                </View>
                <View style={styles.optRow}>
                  <View style={[styles.opt, h.user_answer === h.option_a && (matched ? styles.optMatchActive : styles.optMineActive)]}>
                    <AppText variant="heading" size={13}>{h.option_a}</AppText>
                  </View>
                  <View style={[styles.opt, h.user_answer === h.option_b && (matched ? styles.optMatchActive : styles.optMineActive)]}>
                    <AppText variant="heading" size={13}>{h.option_b}</AppText>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <AppText variant="mono" color={Colors.light} style={{ fontSize: 9 }}>
                    YOU PICKED {h.user_answer.toUpperCase()} · {h.partner_name.toUpperCase()} {h.partner_answer.toUpperCase()}
                  </AppText>
                  <AppText variant="mono" color={Colors.light} style={{ fontSize: 9 }}>{h.date.toUpperCase()}</AppText>
                </View>
              </View>
            );
          })}

          {loading && <ActivityIndicator color={Colors.accent} style={{ marginTop: 20 }} />}

          {hasMore && !loading && history.length > 0 && (
             <AppButton variant="outline" size="md" onPress={handleLoadMore} style={{ marginTop: 12 }}>
                LOAD MORE
             </AppButton>
          )}

          <View style={{ height: 80 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bone },
  inner: { padding: 24 },
  card: {
    borderRadius: 14, padding: 16, backgroundColor: Colors.bone,
    borderWidth: 1, borderColor: Colors.rule, marginBottom: 10,
    shadowColor: Colors.ink2, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  optRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  opt: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: Colors.cream, alignItems: 'center' },
  optMineActive: { backgroundColor: Colors.accent,  color:Colors.white },
  optMatchActive: { backgroundColor: Colors.accent, color:Colors.white },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
});