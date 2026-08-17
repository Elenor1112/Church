import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import {
  useAdminPolls,
  useAdminTrivia,
  useAdminWheels,
  useCreatePoll,
  useCreateTrivia,
  useCreateWheel,
  useTogglePoll,
  useToggleTrivia,
  useToggleWheel,
  useDeleteWheel,
} from "@/features/hooks";
import {
  Screen,
  ScreenHeader,
  Card,
  Text,
  Button,
  SubmitButton,
  Input,
  TextArea,
  EmptyState,
  SkeletonCard,
  Badge,
  SegmentedControl,
  MeterBar,
  OptionRow,
} from "@/components/ui";
import { AppDialog, AppSheet, useControlledOverlay } from "@/components/overlay";
import { SpinWheel } from "@/components/SpinWheel";
import { radius, spacing, hairline, iconSize, touchTarget } from "@/theme/tokens";
import { WHEEL_MAX_SEGMENTS, WHEEL_MIN_SEGMENTS } from "@church/shared";
import type { PollAdminItem, TriviaAdminItem, WheelAdminItem } from "@church/shared";

type Tab = "polls" | "trivia" | "wheel";
type Composer = "poll" | "trivia" | "wheel";

export default function AdminPolls() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("polls");
  const [composer, setComposer] = useState<Composer | null>(null);
  const composerRef = React.useRef<Composer | null>(null);
  composerRef.current = composer;

  const pollsQuery = useAdminPolls();
  const triviaQuery = useAdminTrivia();
  const wheelsQuery = useAdminWheels();

  useControlledOverlay(
    composer !== null,
    ({ close }) =>
      composerRef.current === "poll" ? (
        <CreatePollForm onDone={close} />
      ) : composerRef.current === "trivia" ? (
        <CreateTriviaForm onDone={close} />
      ) : (
        <CreateWheelForm onDone={close} />
      ),
    { variant: "sheet", onClose: () => setComposer(null) },
  );

  const loading = pollsQuery.isLoading || triviaQuery.isLoading || wheelsQuery.isLoading;

  const createLabel =
    tab === "polls" ? t("createPoll") : tab === "trivia" ? t("createTrivia") : t("createWheel");

  const openComposer = () =>
    setComposer(tab === "polls" ? "poll" : tab === "trivia" ? "trivia" : "wheel");

  return (
    <Screen>
      <ScreenHeader title={t("pollsTrivia")} />

      <SegmentedControl
        value={tab}
        onChange={setTab}
        segments={[
          { value: "polls", label: t("polls") },
          { value: "trivia", label: t("trivia") },
          { value: "wheel", label: t("wheel") },
        ]}
      />

      <Button
        title={createLabel}
        variant="outline"
        leftIcon={<Ionicons name="add" size={iconSize.sm} color={colors.ink} />}
        onPress={openComposer}
      />

      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : tab === "polls" ? (
        (pollsQuery.data?.polls ?? []).length === 0 ? (
          <EmptyState
            icon="stats-chart-outline"
            title={t("noPolls")}
            action={{ label: createLabel, onPress: openComposer }}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {(pollsQuery.data?.polls ?? []).map((poll) => (
              <AdminPollCard key={poll.id} poll={poll} />
            ))}
          </View>
        )
      ) : tab === "trivia" ? (
        (triviaQuery.data?.trivia ?? []).length === 0 ? (
          <EmptyState
            icon="help-circle-outline"
            title={t("noTrivia")}
            action={{ label: createLabel, onPress: openComposer }}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            {(triviaQuery.data?.trivia ?? []).map((item) => (
              <AdminTriviaCard key={item.id} item={item} />
            ))}
          </View>
        )
      ) : (wheelsQuery.data?.wheels ?? []).length === 0 ? (
        <EmptyState
          icon="disc-outline"
          title={t("noWheels")}
          action={{ label: createLabel, onPress: openComposer }}
        />
      ) : (
        <View style={{ gap: spacing.md }}>
          {(wheelsQuery.data?.wheels ?? []).map((item) => (
            <AdminWheelCard key={item.id} wheel={item} />
          ))}
        </View>
      )}
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Admin poll card
// ---------------------------------------------------------------------------
function AdminPollCard({ poll }: { poll: PollAdminItem }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const toggle = useTogglePoll();

  function handleToggle() {
    void Haptics.selectionAsync();
    toggle.mutate({ id: poll.id, isActive: !poll.isActive });
  }

  return (
    <Card animateIn style={{ gap: spacing.lg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: spacing.md,
        }}
      >
        <Text variant="subheading" style={{ flex: 1 }}>
          {poll.question}
        </Text>
        <Badge
          label={poll.isActive ? t("active") : t("pollClosed")}
          variant={poll.isActive ? "success" : "neutral"}
          dot
        />
      </View>

      {/* Options with vote bars */}
      <View style={{ gap: spacing.md }}>
        {poll.options.map((opt) => {
          const pct = poll.totalVotes > 0 ? ((opt.voteCount ?? 0) / poll.totalVotes) * 100 : 0;
          return (
            <MeterBar
              key={opt.id}
              percent={pct}
              label={opt.text}
              value={`${opt.voteCount ?? 0} · ${Math.round(pct)}%`}
            />
          );
        })}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.md,
          borderTopWidth: hairline,
          borderTopColor: colors.border,
          paddingTop: spacing.md,
        }}
      >
        <Text variant="small" tone="subtle" tabular>
          {t("totalVotes")}: {poll.totalVotes}
        </Text>
        <Button
          title={poll.isActive ? t("closeItem") : t("reopen")}
          variant={poll.isActive ? "outline" : "secondary"}
          size="sm"
          fullWidth={false}
          disabled={toggle.isPending}
          onPress={handleToggle}
        />
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Admin trivia card
// ---------------------------------------------------------------------------
function AdminTriviaCard({ item }: { item: TriviaAdminItem }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const toggle = useToggleTrivia();

  function handleToggle() {
    void Haptics.selectionAsync();
    toggle.mutate({ id: item.id, isActive: !item.isActive });
  }

  return (
    <Card animateIn style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: spacing.md,
          }}
        >
          <Text variant="subheading" style={{ flex: 1 }}>
            {item.title}
          </Text>
          <Badge
            label={item.isActive ? t("active") : t("pollClosed")}
            variant={item.isActive ? "success" : "neutral"}
            dot
          />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <Text variant="caption" tone="muted">
            {item.questions.length} {item.questions.length === 1 ? t("question") : t("questions")}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Ionicons name="star" size={iconSize.xs} color={colors.subtle} />
            <Text variant="caption" tone="subtle" tabular>
              {item.totalPoints} {t("points")}
            </Text>
          </View>
        </View>
      </View>

      {item.questions.map((q, qIdx) => {
        const pct = q.totalAnswers > 0 ? (q.correctAnswers / q.totalAnswers) * 100 : 0;
        return (
          <View
            key={q.id}
            style={{
              gap: spacing.md,
              paddingTop: qIdx === 0 ? 0 : spacing.lg,
              borderTopWidth: qIdx === 0 ? 0 : hairline,
              borderTopColor: colors.border,
            }}
          >
            <Text variant="subheading">
              {qIdx + 1}. {q.question}
            </Text>

            <View style={{ gap: spacing.sm }}>
              {q.options.map((opt, idx) => {
                const isCorrect = idx === q.correctIndex;
                return (
                  <View
                    key={idx}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing.sm,
                      padding: spacing.sm,
                      borderRadius: radius.xs,
                      backgroundColor: isCorrect ? colors.successSurface : "transparent",
                      borderWidth: hairline,
                      borderColor: isCorrect ? colors.success : "transparent",
                    }}
                  >
                    <Ionicons
                      name={isCorrect ? "checkmark-circle" : "ellipse-outline"}
                      size={iconSize.sm}
                      color={isCorrect ? colors.success : colors.subtle}
                    />
                    <Text
                      variant="caption"
                      style={{ flex: 1 }}
                      tone={isCorrect ? "ink" : "muted"}
                      weight={isCorrect ? "500" : "400"}
                    >
                      {opt}
                    </Text>
                  </View>
                );
              })}
            </View>

            <MeterBar
              percent={pct}
              tone="success"
              label={`${t("correctAnswers")}: ${q.correctAnswers}`}
              value={`${q.totalAnswers} · ${q.points}p`}
              height={5}
            />
          </View>
        );
      })}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          borderTopWidth: hairline,
          borderTopColor: colors.border,
          paddingTop: spacing.md,
        }}
      >
        <Button
          title={item.isActive ? t("closeItem") : t("reopen")}
          variant={item.isActive ? "outline" : "secondary"}
          size="sm"
          fullWidth={false}
          disabled={toggle.isPending}
          onPress={handleToggle}
        />
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Admin wheel card — preview plus per-segment landing counts
// ---------------------------------------------------------------------------
function AdminWheelCard({ wheel }: { wheel: WheelAdminItem }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const toggle = useToggleWheel();
  const remove = useDeleteWheel();
  const [confirming, setConfirming] = useState(false);

  useControlledOverlay(
    confirming,
    ({ close }) => (
      <AppDialog
        title={t("deleteWheel")}
        message={t("deleteWheelConfirm")}
        icon={{ name: "trash", color: colors.error }}
        onClose={close}
        actions={[
          { label: t("cancel"), variant: "outline", onPress: close },
          {
            label: t("deleteWheel"),
            variant: "danger",
            loading: remove.isPending,
            onPress: () => remove.mutate(wheel.id, { onSuccess: close }),
          },
        ]}
      />
    ),
    { variant: "dialog", onClose: () => setConfirming(false) },
  );

  function handleToggle() {
    void Haptics.selectionAsync();
    toggle.mutate({ id: wheel.id, isActive: !wheel.isActive });
  }

  // Total weight drives the displayed odds — the same figure the server uses.
  const totalWeight = wheel.segments.reduce((sum, s) => sum + s.weight, 0);

  return (
    <Card animateIn style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: spacing.md,
          }}
        >
          <Text variant="subheading" style={{ flex: 1 }}>
            {wheel.title}
          </Text>
          <Badge
            label={wheel.isActive ? t("active") : t("pollClosed")}
            variant={wheel.isActive ? "success" : "neutral"}
            dot
          />
        </View>
        {wheel.description ? (
          <Text variant="caption" tone="muted">
            {wheel.description}
          </Text>
        ) : null}
      </View>

      <View style={{ alignItems: "center" }}>
        <SpinWheel segments={wheel.segments} size={200} />
      </View>

      <View style={{ gap: spacing.md }}>
        {wheel.segments.map((seg) => {
          const odds = totalWeight > 0 ? (seg.weight / totalWeight) * 100 : 0;
          const share = wheel.totalSpins > 0 ? (seg.spinCount / wheel.totalSpins) * 100 : 0;
          return (
            <View key={seg.id} style={{ gap: spacing.sm }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: spacing.sm,
                }}
              >
                {/* Swatch ties each row to its slice on the wheel above — the
                    segment colour is admin-authored data, not a theme token. */}
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: seg.color ?? colors.primary,
                  }}
                />
                <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
                  {seg.label}
                </Text>
                <Text variant="small" tone="muted" weight="600" tabular>
                  {seg.spinCount} · {Math.round(odds)}%
                </Text>
              </View>
              <View
                style={{
                  height: 6,
                  borderRadius: radius.pill,
                  backgroundColor: colors.cardAlt,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${share}%`,
                    borderRadius: radius.pill,
                    backgroundColor: seg.color ?? colors.primary,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.md,
          borderTopWidth: hairline,
          borderTopColor: colors.border,
          paddingTop: spacing.md,
        }}
      >
        <Text variant="small" tone="subtle" tabular>
          {t("totalSpins")}: {wheel.totalSpins}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Pressable
            onPress={() => setConfirming(true)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("deleteWheel")}
            style={{
              width: touchTarget - spacing.md,
              height: touchTarget - spacing.md,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="trash-outline" size={iconSize.md} color={colors.subtle} />
          </Pressable>
          <Button
            title={wheel.isActive ? t("closeItem") : t("reopen")}
            variant={wheel.isActive ? "outline" : "secondary"}
            size="sm"
            fullWidth={false}
            disabled={toggle.isPending}
            onPress={handleToggle}
          />
        </View>
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Create poll form
// ---------------------------------------------------------------------------
function CreatePollForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const createPoll = useCreatePoll();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [touched, setTouched] = useState(false);

  const close = () => { setQuestion(""); setOptions(["", ""]); setTouched(false); onDone(); };

  const submit = () => {
    setTouched(true);
    if (!question.trim() || options.some((o) => !o.trim())) return;
    createPoll.mutate(
      { question, options },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          close();
        },
      },
    );
  };

  return (
    <AppSheet
      onClose={close}
      title={t("createPoll")}
      footer={
        <>
          <View style={{ flex: 1 }}><Button title={t("cancel")} variant="outline" onPress={close} /></View>
          <View style={{ flex: 1 }}><SubmitButton title={t("createPoll")} loading={createPoll.isPending} onPress={submit} /></View>
        </>
      }
    >
      <TextArea
        label={t("pollQuestion")}
        placeholder={t("pollQuestion")}
        value={question}
        onChangeText={setQuestion}
        error={touched && !question.trim() ? t("required") : undefined}
      />

      <Text variant="overline" tone="muted" uppercase>
        {t("option")}s
      </Text>

      {options.map((opt, idx) => (
        <Input
          key={idx}
          label={`${t("option")} ${idx + 1}`}
          placeholder={`${t("option")} ${idx + 1}`}
          required
          value={opt}
          onChangeText={(v) => setOptions((prev) => prev.map((o, i) => (i === idx ? v : o)))}
          error={touched && !opt.trim() ? t("required") : undefined}
        />
      ))}

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {options.length < 6 ? (
          <View style={{ flex: 1 }}>
            <Button
              title={t("addOption")}
              variant="outline"
              size="sm"
              onPress={() => setOptions((p) => [...p, ""])}
            />
          </View>
        ) : null}
        {options.length > 2 ? (
          <View style={{ flex: 1 }}>
            <Button
              title={`− ${t("option")} ${options.length}`}
              variant="ghost"
              size="sm"
              onPress={() => setOptions((p) => p.slice(0, -1))}
            />
          </View>
        ) : null}
      </View>
    </AppSheet>
  );
}

// ---------------------------------------------------------------------------
// Create trivia form — a quiz with one or more questions
// ---------------------------------------------------------------------------
interface DraftQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  points: string;
}

const emptyQuestion = (): DraftQuestion => ({ question: "", options: ["", ""], correctIndex: 0, points: "10" });

function CreateTriviaForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const createTrivia = useCreateTrivia();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [touched, setTouched] = useState(false);

  const close = () => {
    setTitle("");
    setQuestions([emptyQuestion()]);
    setTouched(false);
    onDone();
  };

  // Mutate one question in the list immutably.
  const patchQuestion = (idx: number, patch: Partial<DraftQuestion>) =>
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()]);
  const removeQuestion = (idx: number) =>
    setQuestions((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const isValid =
    title.trim().length > 0 &&
    questions.length > 0 &&
    questions.every((q) => q.question.trim() && q.options.every((o) => o.trim()));

  const submit = () => {
    setTouched(true);
    if (!isValid) return;
    createTrivia.mutate(
      {
        title: title.trim(),
        questions: questions.map((q) => ({
          question: q.question.trim(),
          options: q.options.map((o) => o.trim()),
          correctIndex: q.correctIndex,
          points: Number(q.points) || 10,
        })),
      },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          close();
        },
      },
    );
  };

  return (
    <AppSheet
      onClose={close}
      title={t("createTrivia")}
      // Give the body more height since a quiz can have many questions.
      bodyMaxHeightRatio={0.7}
      footer={
        <>
          <View style={{ flex: 1 }}><Button title={t("cancel")} variant="outline" onPress={close} /></View>
          <View style={{ flex: 1 }}><SubmitButton title={t("createTrivia")} loading={createTrivia.isPending} onPress={submit} /></View>
        </>
      }
    >
      <Input
        label={t("triviaTitle")}
        placeholder={t("triviaTitle")}
        value={title}
        onChangeText={setTitle}
        error={touched && !title.trim() ? t("required") : undefined}
      />

      {questions.map((q, qIdx) => (
        <QuestionEditor
          key={qIdx}
          index={qIdx}
          draft={q}
          touched={touched}
          canRemove={questions.length > 1}
          onPatch={(patch) => patchQuestion(qIdx, patch)}
          onRemove={() => removeQuestion(qIdx)}
        />
      ))}

      <Button
        title={t("addQuestion")}
        variant="outline"
        leftIcon={<Ionicons name="add-circle-outline" size={18} />}
        onPress={addQuestion}
      />
    </AppSheet>
  );
}

/** Editor for a single question block within the Create Trivia form. */
function QuestionEditor({
  index,
  draft,
  touched,
  canRemove,
  onPatch,
  onRemove,
}: {
  index: number;
  draft: DraftQuestion;
  touched: boolean;
  canRemove: boolean;
  onPatch: (patch: Partial<DraftQuestion>) => void;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const setOption = (i: number, v: string) =>
    onPatch({ options: draft.options.map((o, idx) => (idx === i ? v : o)) });

  const addOption = () => {
    if (draft.options.length >= 6) return;
    onPatch({ options: [...draft.options, ""] });
  };

  const removeOption = () => {
    if (draft.options.length <= 2) return;
    const next = draft.options.slice(0, -1);
    onPatch({
      options: next,
      correctIndex: draft.correctIndex >= next.length ? 0 : draft.correctIndex,
    });
  };

  return (
    <Card inset elevation="none" style={{ gap: spacing.lg }}>
      <View
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
      >
        <Text variant="overline" tone="muted" uppercase>
          {t("question")} {index + 1}
        </Text>
        {canRemove ? (
          <Pressable
            onPress={onRemove}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Remove question"
          >
            <Ionicons name="trash-outline" size={iconSize.md} color={colors.subtle} />
          </Pressable>
        ) : null}
      </View>

      <TextArea
        label={t("triviaQuestion")}
        placeholder={t("triviaQuestion")}
        required
        value={draft.question}
        onChangeText={(v) => onPatch({ question: v })}
        error={touched && !draft.question.trim() ? t("required") : undefined}
      />

      {draft.options.map((opt, idx) => (
        <Input
          key={idx}
          label={`${t("option")} ${idx + 1}`}
          placeholder={`${t("option")} ${idx + 1}`}
          required
          value={opt}
          onChangeText={(v) => setOption(idx, v)}
          error={touched && !opt.trim() ? t("required") : undefined}
        />
      ))}

      {/* Picking the correct answer is a single choice over the options above,
          so it reads as a radio list rather than a row of equal buttons. */}
      <View style={{ gap: spacing.sm }}>
        <Text variant="caption" weight="500" tone="muted">
          {t("correctAnswer")}
        </Text>
        {draft.options.map((opt, idx) => (
          <OptionRow
            key={idx}
            label={opt.trim() || `${t("option")} ${idx + 1}`}
            state={draft.correctIndex === idx ? "correct" : "idle"}
            onPress={() => onPatch({ correctIndex: idx })}
          />
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {draft.options.length < 6 ? (
          <View style={{ flex: 1 }}>
            <Button title={t("addOption")} variant="outline" size="sm" onPress={addOption} />
          </View>
        ) : null}
        {draft.options.length > 2 ? (
          <View style={{ flex: 1 }}>
            <Button
              title={`− ${t("option")} ${draft.options.length}`}
              variant="ghost"
              size="sm"
              onPress={removeOption}
            />
          </View>
        ) : null}
      </View>

      <Input
        label={t("points")}
        placeholder="10"
        value={draft.points}
        onChangeText={(v) => onPatch({ points: v })}
        keyboardType="numeric"
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Create wheel form — the admin builds the segments the members will spin for
// ---------------------------------------------------------------------------
/** Colors an admin can assign to a segment. Empty label = "let the app pick". */
const SEGMENT_COLORS = [
  "#6B0F1A",
  "#D4AF37",
  "#1E5F74",
  "#2E7D5B",
  "#4A3B78",
  "#C05621",
];

interface DraftSegment {
  label: string;
  color: string | null;
  weight: string;
}

const emptySegment = (i: number): DraftSegment => ({
  label: "",
  color: SEGMENT_COLORS[i % SEGMENT_COLORS.length]!,
  weight: "1",
});

function CreateWheelForm({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const createWheel = useCreateWheel();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [onePerMember, setOnePerMember] = useState(true);
  const [segments, setSegments] = useState<DraftSegment[]>([emptySegment(0), emptySegment(1)]);
  const [touched, setTouched] = useState(false);

  const close = () => {
    setTitle("");
    setDescription("");
    setOnePerMember(true);
    setSegments([emptySegment(0), emptySegment(1)]);
    setTouched(false);
    onDone();
  };

  const patchSegment = (idx: number, patch: Partial<DraftSegment>) =>
    setSegments((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const isValid = title.trim().length > 0 && segments.every((s) => s.label.trim());

  const submit = () => {
    setTouched(true);
    if (!isValid) return;
    createWheel.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        onePerMember,
        segments: segments.map((s) => ({
          label: s.label.trim(),
          color: s.color ?? undefined,
          // A blank or unparseable weight falls back to 1 — an equal slice.
          weight: Math.max(1, Number(s.weight) || 1),
        })),
      },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          close();
        },
      },
    );
  };

  // Live preview of what the members will see, built from the filled-in rows.
  const previewSegments = segments.map((s, i) => ({
    id: `preview-${i}`,
    label: s.label.trim() || `${t("segment")} ${i + 1}`,
    color: s.color,
  }));

  return (
    <AppSheet
      onClose={close}
      title={t("createWheel")}
      bodyMaxHeightRatio={0.7}
      footer={
        <>
          <View style={{ flex: 1 }}><Button title={t("cancel")} variant="outline" onPress={close} /></View>
          <View style={{ flex: 1 }}><SubmitButton title={t("createWheel")} loading={createWheel.isPending} onPress={submit} /></View>
        </>
      }
    >
      <Input
        label={t("wheelTitle")}
        placeholder={t("wheelTitle")}
        required
        value={title}
        onChangeText={setTitle}
        error={touched && !title.trim() ? t("required") : undefined}
      />

      <TextArea
        label={t("wheelDescription")}
        placeholder={t("wheelDescription")}
        value={description}
        onChangeText={setDescription}
      />

      <View style={{ alignItems: "center" }}>
        <SpinWheel segments={previewSegments} size={190} />
      </View>

      {/* One-spin-per-member toggle */}
      <Pressable
        onPress={() => setOnePerMember((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: onePerMember }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          paddingVertical: spacing.sm,
          minHeight: touchTarget,
        }}
      >
        <Ionicons
          name={onePerMember ? "checkbox" : "square-outline"}
          size={iconSize.lg}
          color={onePerMember ? colors.primary : colors.subtle}
        />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="caption" weight="600">
            {t("onePerMember")}
          </Text>
          <Text variant="small" tone="muted">
            {t("onePerMemberHint")}
          </Text>
        </View>
      </Pressable>

      <View style={{ gap: spacing.xs }}>
        <Text variant="overline" tone="muted" uppercase>
          {t("segments")}
        </Text>
        <Text variant="small" tone="subtle">
          {t("weightHint")}
        </Text>
      </View>

      {segments.map((seg, idx) => (
        <Card key={idx} inset elevation="none" style={{ gap: spacing.lg }}>
          <View
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
          >
            <Text variant="overline" tone="muted" uppercase>
              {t("segment")} {idx + 1}
            </Text>
            {segments.length > WHEEL_MIN_SEGMENTS ? (
              <Pressable
                onPress={() => setSegments((p) => p.filter((_, i) => i !== idx))}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Remove segment ${idx + 1}`}
              >
                <Ionicons name="trash-outline" size={iconSize.md} color={colors.subtle} />
              </Pressable>
            ) : null}
          </View>

          <Input
            label={t("segmentLabel")}
            placeholder={t("segmentLabel")}
            required
            value={seg.label}
            onChangeText={(v) => patchSegment(idx, { label: v })}
            error={touched && !seg.label.trim() ? t("required") : undefined}
          />

          <View style={{ gap: spacing.sm }}>
            <Text variant="caption" weight="500" tone="muted">
              {t("segmentColor")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
              {SEGMENT_COLORS.map((hex) => {
                const selected = seg.color === hex;
                return (
                  <Pressable
                    key={hex}
                    onPress={() => patchSegment(idx, { color: hex })}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Color ${hex}`}
                    hitSlop={6}
                    // Selection is a ring around the swatch rather than a thicker
                    // border, so the swatch keeps its true size and the colour
                    // stays readable.
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: radius.sm,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: selected ? 2 : 0,
                      borderColor: colors.ink,
                    }}
                  >
                    <View
                      style={{
                        width: selected ? 22 : 30,
                        height: selected ? 22 : 30,
                        borderRadius: radius.xs,
                        backgroundColor: hex,
                        borderWidth: hairline,
                        borderColor: colors.border,
                      }}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Input
            label={t("segmentWeight")}
            placeholder="1"
            value={seg.weight}
            onChangeText={(v) => patchSegment(idx, { weight: v })}
            keyboardType="numeric"
          />
        </Card>
      ))}

      {segments.length < WHEEL_MAX_SEGMENTS ? (
        <Button
          title={t("addSegment")}
          variant="outline"
          leftIcon={<Ionicons name="add-circle-outline" size={18} />}
          onPress={() => setSegments((p) => [...p, emptySegment(p.length)])}
        />
      ) : null}
    </AppSheet>
  );
}
