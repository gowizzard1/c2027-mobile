import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Image, KeyboardAvoidingView, Linking, Platform, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/auth';
import { getCandidates, getToken, requestStipend, submitMobilizerReport, submitPollingResult } from './src/api';
import type { Candidate, Role, TeamProfile } from './src/types';

const LOGO_URL = 'https://www.maiywa.site/logo.png';
const COLORS = { black: '#0D0D0D', yellow: '#F5C100', green: '#1A7A3C', greenLight: '#22A050', gray: '#F4F4F4', text: '#1F2937' };

const roleLabel: Record<Role, string> = {
  social_media: 'Social Media Team',
  mobilizer: 'Mobilizer Team',
  polling_agent: 'Polling Agent Team',
};

export default function App() {
  return <AuthProvider><CampaignTeamApp /></AuthProvider>;
}

function CampaignTeamApp() {
  const { profile, loading } = useAuth();
  const [launchReady, setLaunchReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLaunchReady(true), 550);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !launchReady) return <LoadingScreen label="Opening Campaign Team…" />;
  return profile ? <Dashboard profile={profile} /> : <LoginScreen />;
}

function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const submit = async () => {
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setBusy(true); setError('');
    try { await login(email.trim(), password); }
    catch (err: any) { setError(err?.message || 'Could not sign in.'); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.blackScreen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: 'height' })} keyboardVerticalOffset={0} style={styles.flex}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.loginWrap}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.loginContent, {
            opacity: entrance,
            transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          }]}>
            <Image source={{ uri: LOGO_URL }} style={styles.loginLogo} resizeMode="contain" />
            <Text style={styles.loginTitle}>Campaign Team</Text>
            <Text style={styles.loginSubtitle}>Sign in with the email and password from your invitation.</Text>
            <View style={styles.loginCard}>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
              <PrimaryButton label={busy ? 'Signing in…' : 'Sign in to Team Portal'} onPress={submit} disabled={busy} />
              <Text style={styles.helpText}>Need an account? Open the campaign invitation link you received by email to set your password first.</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Dashboard({ profile }: { profile: TeamProfile }) {
  const { logout, switchRole, refresh } = useAuth();
  const [tab, setTab] = useState<'home' | 'role' | 'support'>('home');
  const [switching, setSwitching] = useState(false);

  const selectRole = async (assignmentId: string) => {
    if (assignmentId === profile.selectedAssignmentId || switching) return;
    setSwitching(true);
    try { await switchRole(assignmentId); setTab('role'); }
    catch (err: any) { Alert.alert('Could not switch role', err?.message || 'Try again.'); }
    finally { setSwitching(false); }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.topbar}>
        <Image source={{ uri: LOGO_URL }} style={styles.topLogo} resizeMode="contain" />
        <View style={styles.topTitle}><Text style={styles.topKicker}>Campaign Team Portal</Text><Text style={styles.topName}>{profile.name}</Text></View>
        <Pressable onPress={logout} style={styles.logout}><Text style={styles.logoutText}>Log out</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials(profile.name)}</Text></View>
          <View style={styles.flex}><Text style={styles.profileRole}>{roleLabel[profile.role]}</Text><Text style={styles.profileLocation}>{profile.ward}, {profile.constituency}</Text></View>
          <StatusPill status={profile.status} />
        </View>

        {profile.assignments.length > 1 && <View style={styles.section}><SectionTitle title="Your campaign roles" subtitle="Switch workspace without signing in again" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleScroll}>{profile.assignments.filter(a => a.status !== 'archived').map(a => <Pressable key={a.id} onPress={() => selectRole(a.id)} style={[styles.roleChip, a.id === profile.selectedAssignmentId && styles.roleChipActive, a.status === 'suspended' && styles.roleChipDisabled]}><Text style={[styles.roleChipText, a.id === profile.selectedAssignmentId && styles.roleChipTextActive]}>{roleLabel[a.role]}</Text><Text style={[styles.roleChipSub, a.id === profile.selectedAssignmentId && styles.roleChipTextActive]}>{a.status}</Text></Pressable>)}</ScrollView></View>}

        <View style={styles.tabBar}>
          <Tab label="Overview" active={tab === 'home'} onPress={() => setTab('home')} />
          <Tab label={profile.role === 'social_media' ? 'Share' : profile.role === 'mobilizer' ? 'Fieldwork' : 'Results'} active={tab === 'role'} onPress={() => setTab('role')} />
          <Tab label="Support" active={tab === 'support'} onPress={() => setTab('support')} />
        </View>

        {tab === 'home' && <Overview profile={profile} onRefresh={refresh} />}
        {tab === 'role' && <RoleWorkspace profile={profile} onRefresh={refresh} />}
        {tab === 'support' && <SupportWorkspace profile={profile} onRefresh={refresh} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function Overview({ profile }: { profile: TeamProfile; onRefresh: () => Promise<void> }) {
  const approved = profile.isApproved;
  return <View style={styles.stack}>
    <Card>
      <Text style={styles.cardKicker}>Team status</Text>
      <Text style={styles.cardTitle}>{approved ? 'You are active in the Campaign Team' : profile.status === 'suspended' ? 'Your team access is suspended' : 'Your application is under review'}</Text>
      <Text style={styles.bodyText}>{approved ? 'Use your role workspace, submit approved activity, and coordinate with your assigned team.' : 'The campaign team will review your role assignment and update your access here.'}</Text>
    </Card>
    <View style={styles.metrics}><Metric value={profile.assignments.length} label="Roles" /><Metric value={profile.stipend.latestRequest?.status || '—'} label="Support status" /><Metric value={profile.pollingStation?.name ? 'Assigned' : '—'} label="Station" /></View>
    <Card><SectionTitle title="Team standards" subtitle="Operate responsibly" /><Bullet text="Use verified campaign information and respect personal privacy." /><Bullet text="Do not collect voter profiles, preference lists, or private personal data." /><Bullet text="Escalate incidents and questions through your coordinator." /></Card>
  </View>;
}

function RoleWorkspace({ profile, onRefresh }: { profile: TeamProfile; onRefresh: () => Promise<void> }) {
  if (!profile.isApproved) return <Card><Text style={styles.cardTitle}>Role workspace is locked</Text><Text style={styles.bodyText}>Your role must be approved before team tools are available.</Text></Card>;
  if (profile.role === 'social_media') return <SocialWorkspace profile={profile} />;
  if (profile.role === 'mobilizer') return <MobilizerWorkspace profile={profile} onRefresh={onRefresh} />;
  return <PollingWorkspace profile={profile} onRefresh={onRefresh} />;
}

function SocialWorkspace({ profile }: { profile: TeamProfile }) {
  const social = profile.social;
  const share = async () => { if (social) await Share.share({ message: `${social.shareMessage || 'Join the campaign'} ${social.shareUrl || 'https://www.maiywa.site'}` }); };
  return <View style={styles.stack}>
    <Card tone="green"><Text style={styles.cardKickerLight}>Social media mission</Text><Text style={styles.cardTitleLight}>Amplify the campaign, responsibly.</Text><Text style={styles.bodyTextLight}>Use approved messages, coordinate with the team, and engage respectfully.</Text>{social?.groupLink ? <SecondaryButton label="Join Social Team Group" onPress={() => Linking.openURL(social.groupLink)} /> : null}</Card>
    <Card><SectionTitle title="Approved share message" subtitle="Use one-tap native sharing" /><Text style={styles.quote}>{social?.shareMessage || 'Campaign content will be shared by your coordinator.'}</Text><PrimaryButton label="Share campaign update" onPress={share} /></Card>
  </View>;
}

function MobilizerWorkspace({ profile, onRefresh }: { profile: TeamProfile; onRefresh: () => Promise<void> }) {
  const [peopleReached, setPeopleReached] = useState('');
  const [meetingsHeld, setMeetingsHeld] = useState('');
  const [newVolunteers, setNewVolunteers] = useState('');
  const [keyIssues, setKeyIssues] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const mobilizer = profile.mobilizer;
  const submit = async () => {
    const token = await getToken(); if (!token) return;
    setBusy(true);
    try { await submitMobilizerReport(token, { peopleReached: Number(peopleReached || 0), meetingsHeld: Number(meetingsHeld || 0), newVolunteers: Number(newVolunteers || 0), keyIssues, notes }); await onRefresh(); Alert.alert('Report submitted', 'Your aggregate weekly field report is now available to the campaign team.'); }
    catch (err: any) { Alert.alert('Could not submit', err?.message || 'Try again later.'); }
    finally { setBusy(false); }
  };
  return <View style={styles.stack}>
    <Card tone="purple"><Text style={styles.cardKickerLight}>Mobilizer field area</Text><Text style={styles.cardTitleLight}>{profile.ward} Ward</Text><Text style={styles.bodyTextLight}>{profile.constituency}, {profile.county}</Text>{mobilizer?.groupLink ? <SecondaryButton label="Join Mobilizer Group" onPress={() => Linking.openURL(mobilizer.groupLink)} /> : null}</Card>
    {mobilizer?.currentReport ? <Card><Text style={styles.cardTitle}>Weekly report submitted</Text><Text style={styles.bodyText}>{mobilizer.currentReport.peopleReached} people reached · {mobilizer.currentReport.meetingsHeld} meetings · {mobilizer.currentReport.newVolunteers} referrals</Text><StatusPill status={mobilizer.currentReport.status} /></Card> : <Card><SectionTitle title="Weekly field report" subtitle="Aggregate activity only — do not include names or voter preferences" /><Field label="People reached" value={peopleReached} onChangeText={setPeopleReached} keyboardType="numeric" /><Field label="Community meetings" value={meetingsHeld} onChangeText={setMeetingsHeld} keyboardType="numeric" /><Field label="Volunteer referrals" value={newVolunteers} onChangeText={setNewVolunteers} keyboardType="numeric" /><Field label="Key local issues" value={keyIssues} onChangeText={setKeyIssues} multiline /><Field label="Field notes" value={notes} onChangeText={setNotes} multiline /><PrimaryButton label={busy ? 'Submitting…' : 'Submit weekly report'} onPress={submit} disabled={busy} /></Card>}
  </View>;
}

function PollingWorkspace({ profile, onRefresh }: { profile: TeamProfile; onRefresh: () => Promise<void> }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [validVotes, setValidVotes] = useState('');
  const [rejectedVotes, setRejectedVotes] = useState('0');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!profile.pollingResult && profile.pollingStation) getCandidates().then(setCandidates).catch(() => setCandidates([])); }, [profile.pollingResult, profile.pollingStation]);
  const total = useMemo(() => candidates.reduce((sum, c) => sum + Number(votes[c.id] || 0), 0), [candidates, votes]);
  const choosePhoto = async () => { const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) { Alert.alert('Photo permission needed', 'Allow access to select the official results form image.'); return; } const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 }); if (!result.canceled) setPhoto(result.assets[0]); };
  const submit = async () => {
    const token = await getToken(); if (!token || !photo) return;
    if (Number(validVotes) !== total) { Alert.alert('Check totals', 'Valid votes must equal the sum of every candidate count.'); return; }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('candidateVotes', JSON.stringify(candidates.map(c => ({ candidateId: c.id, votes: Number(votes[c.id] || 0) }))));
      form.append('validVotes', validVotes);
      form.append('rejectedVotes', rejectedVotes || '0');
      form.append('notes', notes);
      const formPhoto = new File(photo.uri);
      form.append('formPhoto', formPhoto, photo.fileName || formPhoto.name || 'official-result-form.jpg');
      await submitPollingResult(token, form);
      await onRefresh();
      Alert.alert('Private result submitted', 'The report and form image are now waiting for admin verification. Do not publish it as an official declaration.');
    } catch (err: any) { Alert.alert('Could not submit result', err?.message || 'Try again later.'); }
    finally { setBusy(false); }
  };

  if (!profile.pollingStation) return <Card><Text style={styles.cardTitle}>Station assignment pending</Text><Text style={styles.bodyText}>Result reporting will open after your official Turbo station assignment is approved.</Text></Card>;
  if (profile.pollingResult) return <Card><Text style={styles.cardKicker}>Private station result</Text><Text style={styles.cardTitle}>{profile.pollingStation.name}</Text><StatusPill status={profile.pollingResult.status} /><Text style={styles.bodyText}>Submitted {new Date(profile.pollingResult.submittedAt).toLocaleString()}. The result remains private until campaign verification.</Text>{profile.pollingResult.reviewNote ? <Text style={styles.note}>{profile.pollingResult.reviewNote}</Text> : null}</Card>;
  return <View style={styles.stack}>
    <Card tone="blue"><Text style={styles.cardKickerLight}>Polling station assignment</Text><Text style={styles.cardTitleLight}>{profile.pollingStation.name}</Text><Text style={styles.bodyTextLight}>{profile.pollingStation.ward} Ward · Turbo Constituency · Uasin Gishu</Text></Card>
    <Card><SectionTitle title="Counted result report" subtitle="Private agent report — not an official public declaration" />
      {candidates.length === 0 ? <Text style={styles.bodyText}>Candidate list is not configured yet.</Text> : <>{candidates.map(candidate => <View key={candidate.id} style={styles.candidateRow}><Image source={{ uri: candidate.imageUrl || 'https://www.maiywa.site/logo.png' }} style={styles.candidateImage} /><View style={styles.flex}><Text style={styles.candidateName}>{candidate.name}</Text><Text style={styles.muted}>{candidate.party || 'No affiliation'}</Text></View><TextInput style={styles.voteInput} value={votes[candidate.id] || ''} onChangeText={v => setVotes({ ...votes, [candidate.id]: v })} keyboardType="numeric" placeholder="0" /></View>)}
      <Field label="Valid votes total" value={validVotes} onChangeText={setValidVotes} keyboardType="numeric" /><Field label="Rejected votes" value={rejectedVotes} onChangeText={setRejectedVotes} keyboardType="numeric" /><Text style={Number(validVotes || 0) === total ? styles.good : styles.bad}>Candidate total: {total} · Valid votes: {validVotes || 0}</Text><Field label="Official process observations (optional)" value={notes} onChangeText={setNotes} multiline /><SecondaryButton label={photo ? `Form selected: ${photo.fileName || 'image'}` : 'Select official counted-results form'} onPress={choosePhoto} /><PrimaryButton label={busy ? 'Submitting privately…' : 'Submit private result'} onPress={submit} disabled={busy || !photo || Number(validVotes || 0) !== total} /></>}</Card>
  </View>;
}

function SupportWorkspace({ profile, onRefresh }: { profile: TeamProfile; onRefresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const stipend = profile.stipend;
  const request = async () => { const token = await getToken(); if (!token) return; setBusy(true); try { await requestStipend(token); await onRefresh(); Alert.alert('Support request submitted', 'The campaign team will review your mobile-data support request.'); } catch (err: any) { Alert.alert('Request unavailable', err?.message || 'Try again later.'); } finally { setBusy(false); } };
  return <View style={styles.stack}><Card tone="blue"><Text style={styles.cardKickerLight}>Campaign Team support</Text><Text style={styles.cardTitleLight}>Weekly mobile-data support</Text><Text style={styles.bodyTextLight}>Support is reviewed and approved by the campaign team. It is not guaranteed compensation.</Text></Card><Card><Text style={styles.cardTitle}>{stipend.canRequest ? 'You are eligible to request support' : 'Mobile-data support status'}</Text><Text style={styles.bodyText}>{stipend.reason || `Requests are limited to once every ${stipend.repeatCooldownDays} days after approval.`}</Text>{stipend.nextEligibleAt ? <Text style={styles.muted}>Next eligible: {new Date(stipend.nextEligibleAt).toLocaleString()}</Text> : null}{stipend.latestRequest ? <StatusPill status={stipend.latestRequest.status} /> : null}{stipend.canRequest ? <PrimaryButton label={busy ? 'Submitting…' : 'Request mobile-data support'} onPress={request} disabled={busy} /> : null}</Card></View>;
}

function Field({ label, ...props }: { label: string; value: string; onChangeText: (value: string) => void; secureTextEntry?: boolean; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'; keyboardType?: any; multiline?: boolean }) { return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput style={[styles.input, props.multiline && styles.textarea]} placeholderTextColor="#9CA3AF" {...props} /></View>; }
function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) { return <Pressable disabled={disabled} onPress={onPress} style={[styles.primaryButton, disabled && styles.disabled]}><Text style={styles.primaryButtonText}>{label}</Text></Pressable>; }
function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{label}</Text></Pressable>; }
function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}><Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text></Pressable>; }
function Card({ children, tone }: { children: React.ReactNode; tone?: 'green' | 'purple' | 'blue' }) { return <View style={[styles.card, tone === 'green' && styles.greenCard, tone === 'purple' && styles.purpleCard, tone === 'blue' && styles.blueCard]}>{children}</View>; }
function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) { return <View style={styles.sectionTitle}><Text style={styles.cardTitle}>{title}</Text>{subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}</View>; }
function StatusPill({ status }: { status: string }) { const color = status === 'approved' || status === 'paid' || status === 'verified' || status === 'actioned' ? styles.statusGood : status === 'rejected' || status === 'disputed' || status === 'archived' ? styles.statusBad : styles.statusWarn; return <View style={[styles.statusPill, color]}><Text style={styles.statusText}>{status.replace('_', ' ')}</Text></View>; }
function Metric({ value, label }: { value: string | number; label: string }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
function Bullet({ text }: { text: string }) { return <View style={styles.bullet}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>{text}</Text></View>; }
function LoadingScreen({ label }: { label: string }) {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  return <SafeAreaView style={styles.blackScreen}>
    <StatusBar style="light" />
    <View style={[styles.flex, styles.center]}>
      <Animated.View style={[styles.loadingBrand, {
        opacity: entrance,
        transform: [
          { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
          { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
        ],
      }]}>
        <Image source={require('./assets/splash-icon.png')} style={styles.loadingLogo} resizeMode="contain" />
        <Text style={styles.loadingTitle}>IKM Campaign Team</Text>
        <ActivityIndicator color={COLORS.yellow} size="large" style={styles.loadingSpinner} />
        <Text style={styles.loadingText}>{label}</Text>
      </Animated.View>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, screen: { flex: 1, backgroundColor: COLORS.gray }, blackScreen: { flex: 1, backgroundColor: COLORS.black }, center: { alignItems: 'center', justifyContent: 'center' }, loadingBrand: { alignItems: 'center', paddingHorizontal: 24 }, loadingLogo: { width: 152, height: 152 }, loadingTitle: { marginTop: 8, color: COLORS.yellow, fontSize: 21, fontWeight: '900' }, loadingSpinner: { marginTop: 24 }, loadingText: { marginTop: 14, color: '#fff', fontWeight: '700' },
  loginWrap: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24, alignItems: 'center', justifyContent: 'center' }, loginContent: { width: '100%', alignItems: 'center' }, loginLogo: { width: 210, height: 210 }, loginTitle: { color: COLORS.yellow, fontSize: 28, fontWeight: '900', marginTop: 8 }, loginSubtitle: { color: '#D1D5DB', textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 21 }, loginCard: { width: '100%', maxWidth: 440, backgroundColor: '#fff', padding: 20, borderRadius: 18 },
  topbar: { backgroundColor: COLORS.black, minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: COLORS.yellow }, topLogo: { width: 58, height: 58 }, topTitle: { flex: 1, marginLeft: 8 }, topKicker: { color: COLORS.yellow, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }, topName: { color: '#fff', fontSize: 17, fontWeight: '800' }, logout: { padding: 8 }, logoutText: { color: '#D1D5DB', fontSize: 12, fontWeight: '700' }, content: { padding: 16, gap: 16 },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E5E7EB' }, avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.yellow, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontWeight: '900', color: COLORS.black }, profileRole: { fontSize: 16, fontWeight: '800', color: COLORS.black }, profileLocation: { color: '#6B7280', marginTop: 2, fontSize: 12 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' }, sectionTitle: { marginBottom: 12 }, roleScroll: { gap: 10 }, roleChip: { width: 150, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, borderRadius: 12 }, roleChipActive: { backgroundColor: '#ECFDF5', borderColor: COLORS.green }, roleChipDisabled: { opacity: 0.55 }, roleChipText: { fontWeight: '800', color: COLORS.black }, roleChipSub: { marginTop: 3, color: '#6B7280', fontSize: 11, textTransform: 'capitalize' }, roleChipTextActive: { color: COLORS.green },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#E5E7EB' }, tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 }, tabActive: { backgroundColor: COLORS.green }, tabText: { fontWeight: '700', fontSize: 12, color: '#6B7280' }, tabTextActive: { color: '#fff' },
  stack: { gap: 14 }, card: { backgroundColor: '#fff', padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' }, greenCard: { backgroundColor: COLORS.green, borderColor: COLORS.green }, purpleCard: { backgroundColor: '#6D28D9', borderColor: '#6D28D9' }, blueCard: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' }, cardKicker: { color: COLORS.green, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 6 }, cardKickerLight: { color: COLORS.yellow, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 6 }, cardTitle: { color: COLORS.black, fontSize: 18, fontWeight: '900', marginBottom: 6 }, cardTitleLight: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 6 }, bodyText: { color: '#4B5563', lineHeight: 21 }, bodyTextLight: { color: '#E0F2FE', lineHeight: 21 }, muted: { color: '#6B7280', fontSize: 12, lineHeight: 18 }, quote: { backgroundColor: '#F9FAFB', borderLeftWidth: 4, borderLeftColor: COLORS.yellow, padding: 12, color: '#374151', lineHeight: 20, marginBottom: 14 }, note: { backgroundColor: '#DBEAFE', color: '#1E3A8A', marginTop: 10, padding: 10, borderRadius: 8 },
  metrics: { flexDirection: 'row', gap: 10 }, metric: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }, metricValue: { fontWeight: '900', color: COLORS.green, fontSize: 16, textTransform: 'capitalize' }, metricLabel: { marginTop: 3, color: '#6B7280', fontSize: 10, textAlign: 'center' },
  field: { marginBottom: 12 }, fieldLabel: { color: '#374151', fontWeight: '700', fontSize: 13, marginBottom: 6 }, input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: COLORS.black, backgroundColor: '#fff' }, textarea: { minHeight: 86, textAlignVertical: 'top' }, primaryButton: { backgroundColor: COLORS.green, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 }, primaryButtonText: { color: '#fff', fontWeight: '900' }, secondaryButton: { borderWidth: 1, borderColor: COLORS.green, padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 }, secondaryButtonText: { color: COLORS.green, fontWeight: '800' }, disabled: { opacity: 0.5 }, errorText: { color: '#B91C1C', backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, marginBottom: 12 }, helpText: { marginTop: 16, color: '#6B7280', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  statusPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 }, statusText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' }, statusGood: { backgroundColor: '#DCFCE7' }, statusWarn: { backgroundColor: '#FEF3C7' }, statusBad: { backgroundColor: '#FEE2E2' },
  bullet: { flexDirection: 'row', gap: 8, marginTop: 8 }, bulletDot: { color: COLORS.green, fontWeight: '900' }, bulletText: { flex: 1, color: '#4B5563', lineHeight: 20 },
  candidateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }, candidateImage: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E5E7EB' }, candidateName: { fontWeight: '800', color: COLORS.black }, voteInput: { width: 70, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 9, textAlign: 'right', color: COLORS.black }, good: { color: COLORS.green, fontWeight: '800', marginBottom: 8 }, bad: { color: '#B91C1C', fontWeight: '800', marginBottom: 8 },
});

function initials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'TM'; }
