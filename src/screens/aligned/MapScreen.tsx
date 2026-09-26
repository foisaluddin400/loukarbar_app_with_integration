import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl, Image, Platform } from 'react-native';
import { Colors } from "../../constants/colors";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import { Tag } from "../../components/ui/Tag";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { PinCard } from "../../components/map/PinCard";
import { WorldMapSvg } from "../../components/map/WorldMapSvg";
import { MapPin, PinType } from "../../types";
import { AppTextInput } from "@/components/ui/AppTextInput";
import AlignedNav from "@/components/ui/AlignedNav";
import { DeviceEventEmitter } from "react-native";
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getMapOverview, createPlace, updatePlace, deletePlace, requestDeletePlace, approveDeletePlace, rejectDeletePlace, addMoment } from "../../services/mapApi";
import { triggerNotification } from "../../services/notificationApi";
import { getUserProfile } from "../../services/userApi";
import { CustomAlert } from "../../components/ui/CustomAlert";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { Modal, useWindowDimensions } from "react-native";

interface UIMapPin extends MapPin {
  creator_name?: string;
  moments?: any[];
  deletion_request?: {
    requested_by: string;
    requested_by_name: string;
    created_at: string;
  };
}

const TYPE_FILTERS = ["all", "home", "together", "upcoming", "bucket"] as const;
const PIN_META = {
  home: { label: "Home", color: Colors.muted },
  together: { label: "Together", color: Colors.accent },
  upcoming: { label: "Upcoming", color: Colors.sage },
  bucket: { label: "Bucket", color: Colors.light },
};

const categoryOptions = [
  { label: "Home", value: "home" as PinType },
  { label: "Together", value: "together" as PinType },
  { label: "Upcoming", value: "upcoming" as PinType },
  { label: "Bucket", value: "bucket" as PinType },
] as const;

export const MapScreen: React.FC = () => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [places, setPlaces] = useState<UIMapPin[]>([]);
  const [stats, setStats] = useState({
    total_countries: 0,
    total_cities: 0,
    together_count: 0,
    bucket_count: 0,
    upcoming_count: 0,
    home_count: 0,
  });
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<UIMapPin | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [meetType, setMeetType] = useState<PinType>("together");

  // User Identification
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // New place inputs
  const [newCity, setNewCity] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newNote, setNewNote] = useState("");
  const [visitDateObj, setVisitDateObj] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // New moment inputs
  const [momentType, setMomentType] = useState<'Note' | 'Photo'>('Note');
  const [momentContent, setMomentContent] = useState("");
  const [momentCaption, setMomentCaption] = useState("");
  const [momentPhoto, setMomentPhoto] = useState<any>(null);

  const [isImageViewVisible, setIsImageViewVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8002';

  const mapBackendPlaceToPin = (p: any): UIMapPin => ({
    id: p.id,
    city: p.city,
    country: p.country,
    lat: p.lat,
    lng: p.lng,
    type: p.category.toLowerCase() as PinType,
    owner: p.creator_id,
    note: p.description || '',
    dates: p.visit_date || '',
    moments: p.moments || [],
    creator_name: p.creator_name,
    deletion_request: p.deletion_request,
  });

  const loadMapData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getMapOverview();
      if (data) {
        const mappedPlaces = (data.places || []).map(mapBackendPlaceToPin);
        setPlaces(mappedPlaces);
        if (data.stats) {
          setStats(data.stats);
        }
        if (data.routes) {
          setRoutes(data.routes);
        }
      }
    } catch (err: any) {
      console.error("Error loading map data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMapData();
    getUserProfile().then((res) => {
      if (res && res.success && res.data) {
        setCurrentUserId(res.data.id || res.data._id || "");
      }
    }).catch(err => console.error("Error fetching user profile:", err));

    const sub1 = DeviceEventEmitter.addListener('REFRESH_MAP_DATA', () => {
      loadMapData(false);
    });
    const sub2 = DeviceEventEmitter.addListener('REFRESH_ALIGNED_DATA', () => {
      loadMapData(false);
    });
    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, []);

  const formatDateForPayload = (d: Date) => {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}.${day}.${year}`;
  };

  const handleCreatePlace = async () => {
    if (!newCity.trim() || !newCountry.trim()) {
      CustomAlert.alert("Input required", "Please enter both City and Country.");
      return;
    }

    try {
      const categoryPayload = (meetType.charAt(0).toUpperCase() + meetType.slice(1)) as any;
      const formattedDate = (meetType === 'together' || meetType === 'upcoming')
        ? formatDateForPayload(visitDateObj)
        : undefined;

      await createPlace({
        city: newCity,
        country: newCountry,
        category: categoryPayload,
        description: newNote,
        visit_date: formattedDate,
        timezone: 'Asia/Dhaka',
      });
      triggerNotification("Map Create", `Added ${newCity} to the map`).catch(() => {});

      // Clear inputs
      setNewCity("");
      setNewCountry("");
      setNewNote("");
      setVisitDateObj(new Date());
      setSheet(null);
      loadMapData(false);
    } catch (err: any) {
      console.error("Error creating place:", err);
      CustomAlert.alert("Error", "Failed to add place to map.");
    }
  };

  const handleTransitionBucket = async (place: UIMapPin) => {
    try {
      const updated = await updatePlace(place.id.toString(), {
        category: 'Upcoming',
        visit_date: 'TBD'
      });
      if (updated) {
        const mapped = mapBackendPlaceToPin(updated);
        setSelected(mapped);
        loadMapData(false);
      }
    } catch (err: any) {
      console.error("Error transitioning place:", err);
      CustomAlert.alert("Error", "Failed to transition place.");
    }
  };

  const handleDeletePlace = async (placeId: string) => {
    if (!selected) return;

    // Check if partner has contributed any memory notes/photos to this place
    const hasPartnerContribution = selected.moments && selected.moments.some(
      (m: any) => m.creator_id && currentUserId && m.creator_id !== currentUserId
    );

    if (hasPartnerContribution) {
      CustomAlert.alert(
        "Removal Approval Needed",
        "Your partner has contributed memory notes or photos to this place. Removing it requires their confirmation. Send an approval request?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Send Request",
            onPress: async () => {
              try {
                await requestDeletePlace(placeId);
                CustomAlert.alert(
                  "Request Sent",
                  "An approval request has been sent to your partner. You will be notified once they confirm.",
                  [{ text: "OK" }]
                );
                setSheet(null);
                loadMapData(false);
              } catch (err: any) {
                console.error("Error requesting deletion:", err);
                CustomAlert.alert("Error", "Failed to send request.");
              }
            }
          }
        ]
      );
    } else {
      CustomAlert.alert(
        "Remove Place",
        `Are you sure you want to remove ${selected.city} from your map? This will delete all saved memories.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                await deletePlace(placeId);
                triggerNotification("Map Delete", `Removed ${selected.city} from the map`).catch(() => {});
                setSheet(null);
                setSelected(null);
                loadMapData(false);
              } catch (err: any) {
                console.error("Error deleting place:", err);
                CustomAlert.alert("Error", "Failed to delete place.");
              }
            }
          }
        ]
      );
    }
  };

  const pickMomentPhoto = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setMomentPhoto(result.assets[0]);
    }
  };

  const handleAddMoment = async (placeId: string) => {
    if (momentType === 'Note' && !momentContent.trim()) {
      CustomAlert.alert("Input required", "Please enter a note memory.");
      return;
    }
    if (momentType === 'Photo' && !momentPhoto) {
      CustomAlert.alert("Input required", "Please pick a photo.");
      return;
    }

    try {
      let result;
      if (momentType === 'Note') {
        result = await addMoment(placeId, {
          type: 'Note',
          content: momentContent,
          timezone: 'Asia/Dhaka'
        });
      } else {
        result = await addMoment(
          placeId,
          {
            type: 'Photo',
            caption: momentCaption || undefined,
            timezone: 'Asia/Dhaka'
          },
          momentPhoto
        );
      }

      if (result) {
        const mapped = mapBackendPlaceToPin(result);
        setSelected(mapped);
        setMomentContent("");
        setMomentCaption("");
        setMomentPhoto(null);
        loadMapData(false);
      }
    } catch (err: any) {
      console.error("Error adding moment:", err);
      CustomAlert.alert("Error", "Failed to add memory to place.");
    }
  };

  const photoMoments = selected?.moments?.filter(m => m.type === 'Photo' && !!m.content) || [];
  const photoImages = photoMoments.map(m => ({
    uri: m.content.startsWith('http') ? m.content : `${backendUrl}${m.content}`
  }));

  const handleDownloadImage = async (uri: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        CustomAlert.alert('Permission Needed', 'Please grant permission to save photos.');
        return;
      }
      
      const fileUri = ((FileSystem as any).documentDirectory || '') + `memory_${Date.now()}.jpg`;
      const downloaded = await FileSystem.downloadAsync(uri, fileUri);
      
      await MediaLibrary.saveToLibraryAsync(downloaded.uri);
      CustomAlert.alert('Saved', 'Photo saved to your gallery successfully!', [{ text: 'OK' }]);
    } catch (error) {
      console.error('Download error:', error);
      CustomAlert.alert('Error', 'Failed to download the photo.');
    }
  };

  const renderImageModal = () => {
    const currentPhoto = photoImages[currentImageIndex];
    if (!currentPhoto || !isImageViewVisible) return null;
    const currentMoment = photoMoments[currentImageIndex];

    return (
      <Modal visible={isImageViewVisible} transparent={false} animationType="fade" onRequestClose={() => setIsImageViewVisible(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <SafeAreaView style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, alignItems: 'center', zIndex: 10, position: 'absolute', top: 0, left: 0, right: 0 }}>
            <Pressable onPress={() => setIsImageViewVisible(false)} style={{ padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
            <Pressable onPress={() => handleDownloadImage(currentPhoto.uri)} style={{ padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }}>
              <Ionicons name="download-outline" size={24} color="#fff" />
            </Pressable>
          </SafeAreaView>

          <ScrollView 
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }} 
            maximumZoomScale={3} 
            minimumZoomScale={1}
            centerContent={true}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image source={{ uri: currentPhoto.uri }} style={{ width: windowWidth, height: windowHeight * 0.8 }} resizeMode="contain" />
          </ScrollView>

          {currentMoment?.caption ? (
            <SafeAreaView style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Platform.OS === 'android' ? 40 : 20, backgroundColor: 'rgba(0,0,0,0.6)' }}>
              <AppText color="#fff" size={15} style={{ textAlign: 'center', fontStyle: 'italic' }}>
                {currentMoment.caption}
              </AppText>
            </SafeAreaView>
          ) : null}
        </View>
      </Modal>
    );
  };

  const filtered = filter === "all" ? places : places.filter((p) => p.type === filter);

  const uiStats = {
    countries: stats.total_countries,
    cities: stats.total_cities,
    together: stats.together_count,
    bucket: stats.bucket_count,
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AlignedNav />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadMapData(false);
              }}
              tintColor={Colors.accent}
            />
          }
        >
          <View style={styles.inner}>
            <AppText
              variant="display"
              size={42}
              style={{ lineHeight: 42, marginBottom: 6 }}
            >
              Map
              <AppText size={42} color={Colors.accent}>
                .
              </AppText>
            </AppText>
            <AppText
              variant="serifItalic"
              size={16}
              color={Colors.muted}
              style={{ lineHeight: 24, marginBottom: 20 }}
            >
              Places been, places dreamt — and the line between you.
            </AppText>

            {/* Stats */}
            <View style={styles.statsRow}>
              {[
                { n: uiStats.countries, l: "Countries" },
                { n: uiStats.cities, l: "Cities" },
                { n: uiStats.together, l: "Together" },
                { n: uiStats.bucket, l: "Bucket" },
              ].map((s, i) => (
                <View
                  key={i}
                  style={[styles.statBlock, i < 3 && styles.statBorder]}
                >
                  <AppText
                    variant="serifItalic"
                    size={28}
                    color={Colors.ink}
                    style={{ lineHeight: 28 }}
                  >
                    {s.n}
                  </AppText>
                  <AppText
                    variant="smallCaps"
                    color={Colors.muted}
                    style={{ marginTop: 4, fontSize: 10 }}
                  >
                    {s.l}
                  </AppText>
                </View>
              ))}
            </View>

            {/* Interactive World Map Component */}
            <WorldMapSvg
              places={places}
              selectedPin={selected}
              onSelectPin={(pin) => setSelected(pin)}
            />

            {/* Filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 18 }}
            >
              <View style={{ flexDirection: "row", gap: 6 }}>
                {TYPE_FILTERS.map((t) => (
                  <Tag key={t} active={filter === t} onPress={() => setFilter(t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Tag>
                ))}
              </View>
            </ScrollView>

            {/* Pin list header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 14,
              }}
            >
              <AppText variant="smallCaps" color={Colors.ink2}>
                {filtered.length} places
              </AppText>
              <AppButton
                variant="ghost"
                size="sm"
                onPress={() => setSheet("new")}
                textStyle={{ color: Colors.accent }}
              >
                + ADD
              </AppButton>
            </View>

            {filtered.map((p) => (
              <PinCard
                key={p.id}
                pin={p}
                onPress={() => {
                  setSelected(p);
                  setSheet("detail");
                }}
              />
            ))}

            <View style={{ height: 80 }} />
          </View>
        </ScrollView>
      )}

      {/* Detail BottomSheet */}
      <BottomSheet
        open={sheet === "detail" && !!selected}
        onClose={() => setSheet(null)}
        kicker={selected ? PIN_META[selected.type].label.toUpperCase() : ""}
        title={selected?.city ?? ""}
      >
        {selected && (
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
            <AppText
              variant="mono"
              color={Colors.muted}
              style={{ fontSize: 10, marginBottom: 12 }}
            >
              {selected.country.toUpperCase()} · {selected.lat.toFixed(2)}°, {selected.lng.toFixed(2)}°
            </AppText>

            {selected.note ? (
              <AppText
                variant="serifItalic"
                size={17}
                color={Colors.ink2}
                style={{ lineHeight: 26, marginBottom: 20 }}
              >
                {selected.note}
              </AppText>
            ) : null}

            {selected.dates ? (
              <View style={styles.dateBlock}>
                <AppText
                  variant="smallCaps"
                  color={Colors.accent}
                  style={{ marginBottom: 4 }}
                >
                  When
                </AppText>
                <AppText variant="heading" size={16}>
                  {selected.dates}
                </AppText>
              </View>
            ) : null}

            {/* ==================== MOMENT SECTION ==================== */}
            <AppText
              variant="smallCaps"
              color={Colors.ink2}
              style={{ marginTop: 12, marginBottom: 12 }}
            >
              SAVED MEMORIES
            </AppText>

            {selected.moments && selected.moments.length > 0 ? (
              <View style={{ gap: 10, marginBottom: 20 }}>
                {selected.moments.map((item, index) => {
                  if (item.type === 'Photo' && item.content) {
                    const imgUri = item.content.startsWith('http') ? item.content : `${backendUrl}${item.content}`;
                    const pIndex = photoMoments.findIndex(m => m.id === item.id);
                    return (
                      <Pressable key={index} style={styles.photoMomentCard} onPress={() => {
                        setCurrentImageIndex(pIndex >= 0 ? pIndex : 0);
                        setIsImageViewVisible(true);
                      }}>
                        <Image source={{ uri: imgUri }} style={styles.photoMomentImg} />
                        {item.caption ? (
                          <AppText size={14} style={{ marginTop: 6, fontStyle: 'italic' }}>
                            {item.caption}
                          </AppText>
                        ) : null}
                        <AppText variant="mono" size={9} color={Colors.muted} style={{ marginTop: 4 }}>
                          Saved by {item.creator_name} · {new Date(item.created_at).toLocaleDateString()}
                        </AppText>
                      </Pressable>
                    );
                  } else {
                    return (
                      <View key={index} style={styles.noteMomentCard}>
                        <AppText size={15} style={{ lineHeight: 22 }}>{item.content}</AppText>
                        <AppText variant="mono" size={9} color={Colors.muted} style={{ marginTop: 6 }}>
                          Saved by {item.creator_name} · {new Date(item.created_at).toLocaleDateString()}
                        </AppText>
                      </View>
                    );
                  }
                })}
              </View>
            ) : (
              <AppText variant="serifItalic" color={Colors.muted} style={{ marginBottom: 20 }}>
                No memories saved for this place yet.
              </AppText>
            )}

            {/* ==================== ADD MEMORY SECTION ==================== */}
            <View style={styles.addMomentSection}>
              <AppText variant="smallCaps" color={Colors.accent} style={{ marginBottom: 10 }}>
                ADD A MEMORY
              </AppText>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <Pressable
                  style={[styles.momentTypeBtn, momentType === 'Note' && styles.momentTypeBtnActive]}
                  onPress={() => setMomentType('Note')}
                >
                  <AppText variant="smallCaps" style={{ color: momentType === 'Note' ? '#fff' : Colors.ink }}>
                    Note
                  </AppText>
                </Pressable>
                <Pressable
                  style={[styles.momentTypeBtn, momentType === 'Photo' && styles.momentTypeBtnActive]}
                  onPress={() => setMomentType('Photo')}
                >
                  <AppText variant="smallCaps" style={{ color: momentType === 'Photo' ? '#fff' : Colors.ink }}>
                    Photo
                  </AppText>
                </Pressable>
              </View>

              {momentType === 'Note' ? (
                <View style={{ gap: 8 }}>
                  <AppTextInput
                    label="Write a note"
                    value={momentContent}
                    onChangeText={setMomentContent}
                    placeholder="Describe a special moment..."
                  />
                  <AppButton
                    variant="solid"
                    size="sm"
                    onPress={() => handleAddMoment(selected.id.toString())}
                  >
                    Save Memory Note
                  </AppButton>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {momentPhoto ? (
                    <View style={{ alignItems: 'center', marginVertical: 6 }}>
                      <Image source={{ uri: momentPhoto.uri }} style={{ width: 140, height: 140, borderRadius: 10, marginBottom: 6 }} />
                      <AppButton variant="ghost" size="sm" onPress={() => setMomentPhoto(null)}>
                        Change Photo
                      </AppButton>
                    </View>
                  ) : (
                    <AppButton variant="outline" size="sm" onPress={pickMomentPhoto}>
                      Choose Photo from Gallery
                    </AppButton>
                  )}
                  <AppTextInput
                    label="Caption (Optional)"
                    value={momentCaption}
                    onChangeText={setMomentCaption}
                    placeholder="A beautiful afternoon..."
                  />
                  <AppButton
                    variant="solid"
                    size="sm"
                    onPress={() => handleAddMoment(selected.id.toString())}
                  >
                    Upload Photo Memory
                  </AppButton>
                </View>
              )}
            </View>

            {selected.type === "bucket" && (
              <AppButton
                full
                variant="accent"
                size="lg"
                style={{ marginTop: 24, marginBottom: 10 }}
                onPress={() => handleTransitionBucket(selected)}
              >
                Plan a trip here →
              </AppButton>
            )}

            {selected.deletion_request ? (
              selected.deletion_request.requested_by !== currentUserId ? (
                <View style={{ marginTop: 24 }}>
                  <AppText variant="smallCaps" color={Colors.accent} style={{ marginBottom: 12, textAlign: 'center' }}>
                    PENDING REMOVAL APPROVAL
                  </AppText>
                  <AppText variant="serifItalic" color={Colors.ink2} style={{ marginBottom: 16, textAlign: 'center' }}>
                    {selected.deletion_request.requested_by_name} wants to remove this place from your map.
                  </AppText>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <AppButton
                      variant="outline"
                      size="lg"
                      style={{ flex: 1 }}
                      onPress={async () => {
                        try {
                          await rejectDeletePlace(selected.id.toString());
                          setSheet(null);
                          loadMapData(false);
                        } catch (err) {
                          CustomAlert.alert("Error", "Failed to reject deletion request.");
                        }
                      }}
                    >
                      Reject
                    </AppButton>
                    <AppButton
                      variant="accent"
                      size="lg"
                      style={{ flex: 1 }}
                      onPress={async () => {
                        try {
                          await approveDeletePlace(selected.id.toString());
                          setSheet(null);
                          loadMapData(false);
                        } catch (err) {
                          CustomAlert.alert("Error", "Failed to approve deletion request.");
                        }
                      }}
                    >
                      Approve
                    </AppButton>
                  </View>
                </View>
              ) : (
                <View style={{ marginTop: 24, alignItems: 'center' }}>
                  <AppText variant="smallCaps" color={Colors.muted} style={{ marginBottom: 8 }}>
                    REMOVAL PENDING
                  </AppText>
                  <AppText variant="serifItalic" color={Colors.muted} style={{ textAlign: 'center' }}>
                    Waiting for your partner to approve the removal of this place.
                  </AppText>
                </View>
              )
            ) : (
              <AppButton
                full
                variant="outline"
                size="lg"
                style={{ marginTop: 12 }}
                onPress={() => handleDeletePlace(selected.id.toString())}
              >
                Remove Place
              </AppButton>
            )}

            <AppButton
              full
              variant="ghost"
              size="lg"
              style={{ marginTop: 8 }}
              onPress={() => setSheet(null)}
            >
              Close
            </AppButton>
          </ScrollView>
        )}
      </BottomSheet>

      {/* Add pin sheet */}
      <BottomSheet
        open={sheet === "new"}
        onClose={() => setSheet(null)}
        kicker="NEW"
        title="Mark a place"
      >
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
          <AppText
            variant="serifItalic"
            size={15}
            color={Colors.muted}
            style={{ marginBottom: 22 }}
          >
            Add a city to your shared map.
          </AppText>

          <AppTextInput
            label="City"
            n="01"
            placeholder="Lisbon"
            value={newCity}
            onChangeText={setNewCity}
          />
          <AppTextInput
            label="Country"
            n="02"
            placeholder="Portugal"
            value={newCountry}
            onChangeText={setNewCountry}
          />

          <View style={styles.meetOptions}>
            {categoryOptions.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.meetOption,
                  meetType === option.value && styles.meetSelected,
                ]}
                onPress={() => setMeetType(option.value)}
              >
                <AppText
                  variant="smallCaps"
                  style={{
                    color: meetType === option.value ? "#fff" : Colors.ink,
                  }}
                >
                  {option.label}
                </AppText>
                <View
                  style={[
                    styles.radio,
                    meetType === option.value && styles.radioSelected,
                  ]}
                />
              </Pressable>
            ))}
          </View>

          <AppTextInput
            label="A Note"
            n="04"
            placeholder="What draws you there..."
            value={newNote}
            onChangeText={setNewNote}
          />

          {(meetType === 'together' || meetType === 'upcoming') && (
            <View style={{ marginBottom: 20 }}>
              <AppText variant="smallCaps" color={Colors.ink2} style={{ fontSize: 12, marginBottom: 8 }}>
                Visit Date (Optional)
              </AppText>
              <Pressable
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 15,
                  backgroundColor: '#EAE2D4',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: Colors.rule,
                }}
                onPress={() => setShowDatePicker(true)}
              >
                <AppText variant="display" size={20}>
                  {visitDateObj.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                </AppText>
                <Ionicons name="calendar-outline" size={24} color="#000" />
              </Pressable>

              {showDatePicker && (
                <DateTimePicker
                  value={visitDateObj}
                  mode="date"
                  display="default"
                  onChange={(event: any, selectedDate?: Date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setVisitDateObj(selectedDate);
                    }
                  }}
                />
              )}
            </View>
          )}

          <AppButton
            full
            variant="solid"
            size="lg"
            style={{ marginTop: 12 }}
            onPress={handleCreatePlace}
          >
            Add to map →
          </AppButton>
        </ScrollView>
      </BottomSheet>
      
      {renderImageModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bone },
  inner: { padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bone },
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.cream,
    borderRadius: 14,
    marginBottom: 16,
    padding: 14,
  },
  statBlock: { flex: 1, alignItems: "center" },
  statBorder: { borderRightWidth: 1, borderRightColor: Colors.rule },
  mapPlaceholder: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.rule,
    backgroundColor: Colors.cream,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    padding: 20,
    gap: 12,
  },
  meetOptions: {
    marginBottom: 10,
    gap: 8,
  },
  meetOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#EAE2D4",
    borderRadius: 12,
  },
  meetSelected: {
    backgroundColor: "#1C1C1E",
  },
  radio: {
    width: 6,
    height: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.rule,
  },
  radioSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },

  legend: {
    flexDirection: "row",
    gap: 14,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 10,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  dateBlock: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: `${Colors.accent}10`,
    marginBottom: 18,
  },

  // Dynamic moments styling
  photoMomentCard: {
    backgroundColor: Colors.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.rule,
    padding: 12,
  },
  photoMomentImg: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  noteMomentCard: {
    backgroundColor: Colors.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.rule,
    padding: 14,
  },
  addMomentSection: {
    backgroundColor: Colors.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.rule,
    padding: 16,
    marginVertical: 12,
  },
  momentTypeBtn: {
    flex: 1,
    padding: 10,
    backgroundColor: '#EAE2D4',
    alignItems: 'center',
    borderRadius: 8,
  },
  momentTypeBtnActive: {
    backgroundColor: '#1C1C1E',
  },
});
