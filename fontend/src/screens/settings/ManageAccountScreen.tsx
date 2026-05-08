import React from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { fonts } from '../../constants/fonts';
import { useTheme } from '../../context/ThemeContext';
import { useDummySession } from '../../context/DummySessionContext';
import CommonHeader from '../../components/CommonHeader/CommonHeader';
import { DummyUser } from '../../data/dummyUsers';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageAccount'>;

export default function ManageAccountScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const { manageableUsers, removeUserById, currentUser } = useDummySession();

  const surface = paperTheme.colors.surface;

  const confirmDelete = (user: DummyUser) => {
    Alert.alert(
      'Remove user',
      `Remove ${user.name} from the dummy list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeUserById(user.id),
        },
      ],
    );
  };

  const renderRightActions = (user: DummyUser) => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={[styles.swipeBtn, { backgroundColor: paperTheme.colors.primary }]}
        onPress={() => {
          navigation.navigate('EditUser', { userId: user.id });
        }}
      >
        <Ionicons name="pencil" size={18} color="#fff" />
        <Text style={styles.swipeBtnText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeBtn, { backgroundColor: '#dc2626' }]}
        onPress={() => {
          confirmDelete(user);
        }}
      >
        <Ionicons name="trash-outline" size={18} color="#fff" />
        <Text style={styles.swipeBtnText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <CommonHeader
          title="Manage account"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <Text
          style={[styles.caption, { color: paperTheme.colors.onSurfaceVariant, paddingHorizontal: 16 }]}
        >
          {currentUser.role === 'owner'
            ? 'Swipe left on a row to edit or remove admins and staff.'
            : 'Swipe left on a row to edit or remove staff.'}
        </Text>

        <ScrollView contentContainerStyle={styles.scroll}>
          {manageableUsers.length === 0 ? (
            <Text style={{ color: paperTheme.colors.onSurfaceVariant, fontFamily: fonts.PoppinsRegular, padding: 16 }}>
              No accounts to show.
            </Text>
          ) : (
            manageableUsers.map((user) => (
              <Swipeable
                key={user.id}
                friction={2}
                rightThreshold={40}
                renderRightActions={() => renderRightActions(user)}
              >
                <View style={[styles.row, { backgroundColor: surface }]}>
                  <View style={[styles.dot, { backgroundColor: paperTheme.colors.primaryContainer }]}>
                    <Text style={[styles.dotText, { color: paperTheme.colors.primary }]}>
                      {user.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={[styles.rowTitle, { color: paperTheme.colors.onSurface }]}>
                      {user.name}
                    </Text>
                    <Text style={[styles.rowSub, { color: paperTheme.colors.onSurfaceVariant }]}>
                      {user.email}
                    </Text>
                  </View>
                  <Text style={[styles.badge, { color: paperTheme.colors.primary }]}>
                    {user.role}
                  </Text>
                </View>
              </Swipeable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  caption: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dotText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  rowSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  swipeBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 84,
    paddingVertical: 12,
    gap: 4,
  },
  swipeBtnText: {
    color: '#fff',
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
});
