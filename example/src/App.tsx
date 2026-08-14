import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GeelabGuard } from 'geelabguard-rn-plugin';
import {
  createGeelabGuardController,
  type PublicOperationResult,
} from './GeelabGuardController';
import {
  INTERNAL_TEST_ENVIRONMENTS,
  type InternalTestEnvironment,
} from './InternalTestEnvironments_example';
import {
  createClientReportUrl,
  queryRespondedToken,
  type TokenQueryResult,
} from './TokenQuery';

type Operation = PublicOperationResult['operation'];
type RuntimeWithEnvironment = typeof globalThis & {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

const environment = (globalThis as RuntimeWithEnvironment).process?.env;
const defaultEnvironment = INTERNAL_TEST_ENVIRONMENTS[0];
const initialAppId =
  environment?.GEELAB_GUARD_TEST_APP_ID ?? defaultEnvironment?.appId ?? '';
const initialServerUrl =
  environment?.GEELAB_GUARD_TEST_SERVER_URL ??
  defaultEnvironment?.serverUrl ??
  '';

export default function App() {
  const controller = useMemo(
    () => createGeelabGuardController(GeelabGuard),
    []
  );
  const [version, setVersion] = useState('Checking');
  const [selectedEnvironment, setSelectedEnvironment] = useState(
    defaultEnvironment?.name ?? ''
  );
  const [environmentMenuOpen, setEnvironmentMenuOpen] = useState(false);
  const [appId, setAppId] = useState(initialAppId);
  const [serverUrl, setServerUrl] = useState(initialServerUrl);
  const [privateKey, setPrivateKey] = useState(
    defaultEnvironment?.privateKey ?? ''
  );
  const [privateKeyVisible, setPrivateKeyVisible] = useState(false);
  const [signData, setSignData] = useState('');
  const [activeOperation, setActiveOperation] = useState<Operation | null>(
    null
  );
  const [result, setResult] = useState<PublicOperationResult | null>(null);
  const [respondedGeeToken, setRespondedGeeToken] = useState('');
  const [queryResult, setQueryResult] = useState<TokenQueryResult | null>(null);
  const [queryBusy, setQueryBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    controller.getVersion().then(
      (value) => mounted && setVersion(value),
      () => mounted && setVersion('Unavailable')
    );
    return () => {
      mounted = false;
    };
  }, [controller]);

  const run = async (
    operation: Operation,
    action: () => Promise<PublicOperationResult>
  ) => {
    Keyboard.dismiss();
    setActiveOperation(operation);
    setResult(null);
    try {
      setResult(await action());
    } finally {
      setActiveOperation(null);
    }
  };

  const isBusy = activeOperation !== null;
  const anyOperationBusy = isBusy || queryBusy;
  const queryReady =
    serverUrl.trim().length > 0 &&
    appId.trim().length > 0 &&
    privateKey.trim().length > 0 &&
    respondedGeeToken.length > 0;

  const chooseEnvironment = (item: InternalTestEnvironment) => {
    setSelectedEnvironment(item.name);
    setServerUrl(item.serverUrl);
    setAppId(item.appId);
    setPrivateKey(item.privateKey);
    setEnvironmentMenuOpen(false);
    setRespondedGeeToken('');
    setQueryResult(null);
  };

  const submitReceipt = () => {
    setQueryResult(null);
    return run('submitReceipt', async () => {
      const submission = await controller.submitReceipt(signData);
      const token = submission.receipt?.respondedGeeToken;
      setRespondedGeeToken(typeof token === 'string' ? token : '');
      return submission;
    });
  };

  const queryToken = async () => {
    Keyboard.dismiss();
    setQueryBusy(true);
    setQueryResult(null);
    try {
      setQueryResult(
        await queryRespondedToken({
          serverUrl,
          appId,
          privateKey,
          respondedGeeToken,
        })
      );
    } finally {
      setQueryBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>REACT NATIVE BRIDGE</Text>
            <Text accessibilityRole="header" style={styles.title}>
              GeelabGuard
            </Text>
            <View style={styles.versionRow}>
              <Text style={styles.versionLabel}>Native SDK</Text>
              <Text style={styles.versionValue}>{version}</Text>
            </View>
          </View>

          <View style={styles.formSection}>
            <EnvironmentSelect
              selected={selectedEnvironment}
              open={environmentMenuOpen}
              onToggle={() => setEnvironmentMenuOpen((value) => !value)}
              onSelect={chooseEnvironment}
            />
            <Field
              label="App ID"
              value={appId}
              onChangeText={setAppId}
              placeholder="Enter your test App ID"
              autoCapitalize="none"
            />
            <Field
              label="Server URL"
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="Optional regional endpoint"
              autoCapitalize="none"
              keyboardType="url"
            />
            <PrivateKeyField
              value={privateKey}
              visible={privateKeyVisible}
              onChangeText={setPrivateKey}
              onToggleVisibility={() => setPrivateKeyVisible((value) => !value)}
            />
            <Field
              label="Sign data"
              value={signData}
              onChangeText={setSignData}
              placeholder="Business data bound to the receipt"
              autoCapitalize="none"
              multiline
            />
          </View>

          <View style={styles.actions}>
            <ActionButton
              label="Initialize SDK"
              active={activeOperation === 'initialize'}
              disabled={anyOperationBusy}
              onPress={() =>
                run('initialize', () =>
                  controller.initialize(
                    appId,
                    serverUrl ? createClientReportUrl(serverUrl) : undefined
                  )
                )
              }
            />
            <View style={styles.secondaryActions}>
              <ActionButton
                label="Create local receipt"
                active={activeOperation === 'fetchReceipt'}
                disabled={anyOperationBusy}
                secondary
                onPress={() =>
                  run('fetchReceipt', () => controller.fetchReceipt(signData))
                }
              />
              <ActionButton
                label="Submit receipt"
                active={activeOperation === 'submitReceipt'}
                disabled={anyOperationBusy}
                secondary
                onPress={submitReceipt}
              />
            </View>
            <ActionButton
              label="Token Query"
              active={queryBusy}
              disabled={anyOperationBusy || !queryReady}
              onPress={queryToken}
            />
          </View>

          <ResultPanel result={result} busy={isBusy} />
          <QueryResultPanel result={queryResult} busy={queryBusy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EnvironmentSelect({
  selected,
  open,
  onToggle,
  onSelect,
}: {
  selected: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (item: InternalTestEnvironment) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Environment</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.selectButton,
          pressed && styles.pressedButton,
        ]}
      >
        <Text style={styles.selectValue}>
          {selected || 'Select environment'}
        </Text>
        <Text accessibilityElementsHidden style={styles.selectChevron}>
          {open ? '^' : 'v'}
        </Text>
      </Pressable>
      {open ? (
        <View style={styles.selectMenu}>
          {INTERNAL_TEST_ENVIRONMENTS.map((item) => (
            <Pressable
              key={item.name}
              accessibilityRole="button"
              onPress={() => onSelect(item)}
              style={({ pressed }) => [
                styles.selectOption,
                item.name === selected && styles.selectedOption,
                pressed && styles.pressedButton,
              ]}
            >
              <Text style={styles.selectOptionName}>{item.name}</Text>
              <Text numberOfLines={1} style={styles.selectOptionUrl}>
                {item.serverUrl}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoCapitalize: 'none';
  keyboardType?: 'default' | 'url';
  multiline?: boolean;
};

function Field({ label, multiline = false, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        autoCorrect={false}
        keyboardType={inputProps.keyboardType ?? 'default'}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        style={[styles.input, multiline && styles.multilineInput]}
      />
    </View>
  );
}

function PrivateKeyField({
  value,
  visible,
  onChangeText,
  onToggleVisibility,
}: {
  value: string;
  visible: boolean;
  onChangeText: (value: string) => void;
  onToggleVisibility: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Private Key</Text>
      <View style={styles.secureInputRow}>
        <TextInput
          accessibilityLabel="Private Key"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onChangeText}
          placeholder="Enter your test Private Key"
          placeholderTextColor={colors.muted}
          secureTextEntry={!visible}
          selectionColor={colors.accent}
          style={styles.secureInput}
          value={value}
        />
        <Pressable
          accessibilityLabel={visible ? 'Hide Private Key' : 'Show Private Key'}
          accessibilityRole="button"
          onPress={onToggleVisibility}
          style={({ pressed }) => [
            styles.visibilityButton,
            pressed && styles.pressedButton,
          ]}
        >
          <Text style={styles.visibilityButtonLabel}>
            {visible ? 'Hide' : 'Show'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

type ActionButtonProps = {
  label: string;
  active: boolean;
  disabled: boolean;
  secondary?: boolean;
  onPress: () => void;
};

function ActionButton({
  label,
  active,
  disabled,
  secondary = false,
  onPress,
}: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondaryButton,
        pressed && !disabled && styles.pressedButton,
        disabled && styles.disabledButton,
      ]}
    >
      {active ? (
        <ActivityIndicator color={secondary ? colors.ink : colors.canvas} />
      ) : (
        <Text
          style={[styles.buttonLabel, secondary && styles.secondaryButtonLabel]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function ResultPanel({
  result,
  busy,
}: {
  result: PublicOperationResult | null;
  busy: boolean;
}) {
  const isError = result?.status === 'error';
  const status = busy
    ? 'Operation in progress'
    : (result?.message ?? 'Ready for an SDK operation');
  const receipt = result?.receipt;

  return (
    <View accessibilityLiveRegion="polite" style={styles.results}>
      <ResultSection title="Latest status" error={isError}>
        <Text selectable style={styles.resultValue}>
          {status}
        </Text>
      </ResultSection>

      {receipt ? (
        <>
          <ResultSection title="Receipt summary">
            <DetailRow label="App ID" value={receipt.appId} />
            <DetailRow label="Gee ID" value={receipt.geeId} />
            <DetailRow
              label="Gee ID timestamp"
              value={receipt.geeIdTimestamp}
            />
          </ResultSection>
          <ResultSection title="Responded GeeToken">
            <LongValue value={receipt.respondedGeeToken} />
          </ResultSection>
          <ResultSection title="GeeToken">
            <LongValue value={receipt.geeToken} />
          </ResultSection>
          <ResultSection title="Original response (Base64)">
            <LongValue value={receipt.originalResponseBase64} />
          </ResultSection>
        </>
      ) : null}

      {isError ? (
        <ResultSection title="Error details" error>
          <DetailRow label="Public code" value={result.errorCode} />
          <DetailRow
            label="Native code"
            value={
              result.nativeCode === null || result.nativeCode === undefined
                ? null
                : String(result.nativeCode)
            }
          />
          {result.canFallbackToGeeToken ? (
            <Text selectable style={styles.fallbackText}>
              Submission failed, but this receipt contains a local GeeToken that
              can be sent through your secure server fallback flow.
            </Text>
          ) : null}
        </ResultSection>
      ) : null}
    </View>
  );
}

function QueryResultPanel({
  result,
  busy,
}: {
  result: TokenQueryResult | null;
  busy: boolean;
}) {
  if (!busy && !result) return null;

  const isError = result?.status !== 'success';
  return (
    <View accessibilityLiveRegion="polite" style={styles.queryResults}>
      <ResultSection title="Token query" error={isError}>
        <Text selectable style={styles.resultValue}>
          {busy ? 'Query in progress' : result?.message}
        </Text>
        {result && 'httpStatus' in result ? (
          <DetailRow label="HTTP status" value={String(result.httpStatus)} />
        ) : null}
      </ResultSection>
      {result && 'responseBody' in result ? (
        <ResultSection title="Query response" error={isError}>
          <LongValue value={result.responseBody} />
        </ResultSection>
      ) : null}
    </View>
  );
}

function ResultSection({
  title,
  error = false,
  children,
}: {
  title: string;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.resultSection, error && styles.errorSection]}>
      <Text style={styles.resultSectionTitle}>{title}</Text>
      <View style={styles.resultSectionBody}>{children}</View>
    </View>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={styles.detailValue}>
        {value || '-'}
      </Text>
    </View>
  );
}

function LongValue({ value }: { value: string | null }) {
  return (
    <Text selectable style={styles.longValue}>
      {value || '-'}
    </Text>
  );
}

const colors = {
  canvas: '#F7F9F8',
  surface: '#FFFFFF',
  ink: '#17211E',
  muted: '#68736F',
  line: '#D6DDDA',
  accent: '#087F63',
  error: '#A44720',
  errorSurface: '#FFF3ED',
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 40,
  },
  header: { paddingBottom: 28 },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  title: {
    color: colors.ink,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 0,
    marginTop: 6,
  },
  versionRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  versionLabel: { color: colors.muted, fontSize: 14 },
  versionValue: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  formSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: 24,
    gap: 20,
  },
  field: { gap: 8 },
  fieldLabel: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  selectButton: {
    minHeight: 50,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  selectValue: { flex: 1, color: colors.ink, fontSize: 16 },
  selectChevron: {
    width: 28,
    color: colors.muted,
    fontSize: 16,
    textAlign: 'right',
  },
  selectMenu: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  selectOption: { minHeight: 58, justifyContent: 'center', padding: 12 },
  selectedOption: { backgroundColor: '#EAF5F1' },
  selectOptionName: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  selectOptionUrl: { color: colors.muted, fontSize: 12, marginTop: 3 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multilineInput: { minHeight: 92, textAlignVertical: 'top' },
  secureInputRow: {
    minHeight: 50,
    alignItems: 'stretch',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  secureInput: {
    minWidth: 0,
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  visibilityButton: {
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.line,
    paddingHorizontal: 12,
  },
  visibilityButtonLabel: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  actions: { gap: 12, marginTop: 26 },
  secondaryActions: { flexDirection: 'row', gap: 12 },
  button: {
    minHeight: 50,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
  },
  secondaryButton: { backgroundColor: colors.surface },
  pressedButton: { opacity: 0.82 },
  disabledButton: { opacity: 0.48 },
  buttonLabel: {
    color: colors.canvas,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButtonLabel: { color: colors.ink },
  results: { gap: 16, marginTop: 28 },
  queryResults: { gap: 16, marginTop: 16 },
  resultSection: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    backgroundColor: colors.surface,
    padding: 16,
  },
  errorSection: {
    borderColor: colors.error,
    backgroundColor: colors.errorSurface,
  },
  resultSectionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  resultSectionBody: { gap: 10, marginTop: 12 },
  resultValue: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  detailRow: { gap: 4 },
  detailLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  detailValue: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  longValue: {
    color: colors.ink,
    fontFamily: Platform.select({ android: 'monospace', ios: 'Menlo' }),
    fontSize: 12,
    lineHeight: 18,
  },
  fallbackText: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.error,
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
    paddingTop: 10,
  },
});
