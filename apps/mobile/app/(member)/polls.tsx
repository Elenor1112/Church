import React, { useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import {
  usePolls,
  useTrivia,
  useVotePoll,
  useAnswerTrivia,
  useWheels,
  useSpinWheel,
} from "@/features/hooks";
import { usePollsStore } from "@/store/uiStores";
import {
  Screen,
  ScreenHeader,
  Card,
  Text,
  Button,
  EmptyState,
  SkeletonCard,
  SegmentedControl,
  OptionRow,
  Badge,
  type OptionState,
} from "@/components/ui";
import { SpinWheel, type SpinWheelHandle } from "@/components/SpinWheel";
import { radius, spacing, hairline, iconSize } from "@/theme/tokens";
import type { PollItem, TriviaItem, TriviaQuestionItem, WheelItem } from "@church/shared";

type Tab = "polls" | "trivia" | "wheel";

export default function Polls() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("polls");

  const pollsQuery = usePolls();
  const triviaQuery = useTrivia();
  const wheelsQuery = useWheels();
  const markSeen = usePollsStore((s) => s.markSeen);

  // Mark tab as seen whenever it gains focus, clearing the badge dot.
  useFocusEffect(
    useCallback(() => {
      markSeen();
    }, [markSeen]),
  );

  const loading = pollsQuery.isLoading || triviaQuery.isLoading || wheelsQuery.isLoading;
  const polls = pollsQuery.data?.polls ?? [];
  const triviaItems = triviaQuery.data?.trivia ?? [];
  const wheels = wheelsQuery.data?.wheels ?? [];

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

      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : tab === "polls" ? (
        polls.length === 0 ? (
          <EmptyState icon="stats-chart-outline" title={t("noPolls")} />
        ) : (
          <View style={{ gap: spacing.md }}>
            {polls.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </View>
        )
      ) : tab === "trivia" ? (
        triviaItems.length === 0 ? (
          <EmptyState icon="help-circle-outline" title={t("noTrivia")} />
        ) : (
          <View style={{ gap: spacing.md }}>
            {triviaItems.map((item) => (
              <TriviaCard key={item.id} item={item} />
            ))}
          </View>
        )
      ) : wheels.length === 0 ? (
        <EmptyState icon="disc-outline" title={t("noWheels")} />
      ) : (
        <View style={{ gap: spacing.md }}>
          {wheels.map((item) => (
            <WheelCard key={item.id} wheel={item} />
          ))}
        </View>
      )}
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Poll card
// ---------------------------------------------------------------------------
function PollCard({ poll }: { poll: PollItem }) {
  const { t } = useI18n();
  const votePoll = useVotePoll();
  const [selected, setSelected] = useState<string | null>(poll.myVoteOptionId);

  const hasVoted = selected !== null;
  const totalVotes = poll.totalVotes;

  function handleVote(optionId: string) {
    if (hasVoted || votePoll.isPending) return;
    setSelected(optionId);
    void Haptics.selectionAsync();
    votePoll.mutate({ pollId: poll.id, optionId });
  }

  return (
    <Card animateIn style={{ gap: spacing.lg }}>
      <Text variant="subheading">{poll.question}</Text>

      <View style={{ gap: spacing.sm }}>
        {poll.options.map((opt) => {
          const isSelected = selected === opt.id;
          const pct = hasVoted && totalVotes > 0 ? ((opt.voteCount ?? 0) / totalVotes) * 100 : 0;
          return (
            <OptionRow
              key={opt.id}
              label={opt.text}
              state={isSelected ? "selected" : "idle"}
              disabled={hasVoted}
              percent={hasVoted ? pct : undefined}
              trailing={hasVoted ? `${Math.round(pct)}%` : undefined}
              onPress={() => handleVote(opt.id)}
            />
          );
        })}
      </View>

      {hasVoted ? (
        <Text variant="small" tone="subtle">
          {t("totalVotes")}: {totalVotes}
        </Text>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Trivia card
// ---------------------------------------------------------------------------
function TriviaCard({ item }: { item: TriviaItem }) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const answeredCount = item.questions.filter((q) => q.myAnswer).length;
  const allAnswered = answeredCount === item.questions.length;
  const earned = item.questions.reduce((sum, q) => sum + (q.myAnswer?.pointsEarned ?? 0), 0);

  return (
    <Card animateIn style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: spacing.md,
          }}
        >
          <Text variant="overline" tone="muted" uppercase>
            {t("trivia")}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Ionicons name="star" size={iconSize.xs} color={colors.primary} />
            <Text variant="small" tone="primary" weight="600" tabular>
              {item.totalPoints} {t("points")}
            </Text>
          </View>
        </View>

        <Text variant="heading">{item.title}</Text>

        <Text variant="caption" tone="muted">
          {answeredCount}/{item.questions.length} {t("answered")}
          {allAnswered ? ` · +${earned} ${t("pointsEarned")}` : ""}
        </Text>
      </View>

      <View style={{ gap: spacing.xl }}>
        {item.questions.map((q, idx) => (
          <TriviaQuestionBlock key={q.id} question={q} index={idx} />
        ))}
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Spin wheel card
// ---------------------------------------------------------------------------
function WheelCard({ wheel }: { wheel: WheelItem }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const spinWheel = useSpinWheel();
  const wheelRef = React.useRef<SpinWheelHandle>(null);

  // The server's result is held here until the animation finishes, so the prize
  // is not spoiled before the wheel stops turning.
  const [result, setResult] = useState<{ label: string; index: number } | null>(
    wheel.mySpin ? { label: wheel.mySpin.label, index: wheel.mySpin.index } : null,
  );
  const [spinning, setSpinning] = useState(false);

  const alreadySpun = wheel.onePerMember && wheel.mySpin !== null;
  const canSpin = !spinning && !alreadySpun && wheel.segments.length > 0;

  function handleSpin() {
    if (!canSpin) return;
    setSpinning(true);
    setResult(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    spinWheel.mutate(wheel.id, {
      onSuccess: (res) => {
        wheelRef.current?.spinTo(res.index, () => {
          setResult({ label: res.label, index: res.index });
          setSpinning(false);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // Refresh only after the reveal so the card does not re-render mid-spin.
          queryClient.invalidateQueries({ queryKey: ["wheels"] });
        });
      },
      onError: () => setSpinning(false),
    });
  }

  return (
    <Card animateIn style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="heading">{wheel.title}</Text>
        {wheel.description ? (
          <Text variant="caption" tone="muted">
            {wheel.description}
          </Text>
        ) : null}
      </View>

      <View style={{ alignItems: "center" }}>
        <SpinWheel ref={wheelRef} segments={wheel.segments} highlightIndex={result?.index ?? null} />
      </View>

      {result ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            padding: spacing.md,
            borderRadius: radius.sm,
            borderWidth: hairline,
            borderColor: colors.success,
            backgroundColor: colors.successSurface,
          }}
        >
          <Ionicons name="gift" size={iconSize.md} color={colors.success} />
          <Text variant="caption" weight="600" style={{ flex: 1, color: colors.success }}>
            {t("youWon")}: {result.label}
          </Text>
        </View>
      ) : null}

      {alreadySpun && !spinning ? (
        <Text variant="caption" tone="muted" center>
          {t("alreadySpun")}
        </Text>
      ) : (
        <Button
          title={spinning ? t("spinning") : t("spin")}
          onPress={handleSpin}
          disabled={!canSpin}
          loading={spinning}
        />
      )}
    </Card>
  );
}

/** A single answerable question inside a trivia quiz card. */
function TriviaQuestionBlock({ question, index }: { question: TriviaQuestionItem; index: number }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const answerTrivia = useAnswerTrivia();
  const [chosen, setChosen] = useState<number | null>(question.myAnswer?.chosenIndex ?? null);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctIndex: number;
    pointsEarned: number;
  } | null>(
    question.myAnswer
      ? {
          isCorrect: question.myAnswer.isCorrect,
          correctIndex: question.correctIndex ?? 0,
          pointsEarned: question.myAnswer.pointsEarned,
        }
      : null,
  );

  const hasAnswered = chosen !== null;

  function handleAnswer(idx: number) {
    if (hasAnswered || answerTrivia.isPending) return;
    setChosen(idx);
    void Haptics.selectionAsync();
    answerTrivia.mutate(
      { questionId: question.id, chosenIndex: idx },
      {
        onSuccess: (res) => {
          setFeedback(res);
          void Haptics.notificationAsync(
            res.isCorrect
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Error,
          );
        },
        onError: () => setChosen(null),
      },
    );
  }

  return (
    <View
      style={{
        gap: spacing.md,
        paddingTop: index === 0 ? 0 : spacing.lg,
        borderTopWidth: index === 0 ? 0 : hairline,
        borderTopColor: colors.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: spacing.md,
        }}
      >
        <Text variant="subheading" style={{ flex: 1 }}>
          {index + 1}. {question.question}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.xs,
            // Nudge to the first line's cap height.
            marginTop: 2,
          }}
        >
          <Ionicons name="star" size={iconSize.xs} color={colors.subtle} />
          <Text variant="small" tone="subtle" tabular>
            {question.points}
          </Text>
        </View>
      </View>

      {feedback ? (
        <Badge
          label={
            feedback.isCorrect
              ? `${t("correct")} · +${feedback.pointsEarned}`
              : t("incorrect")
          }
          variant={feedback.isCorrect ? "success" : "error"}
          dot
        />
      ) : null}

      <View style={{ gap: spacing.sm }}>
        {question.options.map((opt, idx) => {
          const isChosen = chosen === idx;
          const isCorrectOpt = feedback !== null && idx === feedback.correctIndex;
          const isWrong = isChosen && feedback !== null && !feedback.isCorrect;

          let state: OptionState = "idle";
          if (isCorrectOpt) state = "correct";
          else if (isWrong) state = "wrong";
          else if (isChosen) state = "selected";

          return (
            <OptionRow
              key={idx}
              label={opt}
              state={state}
              shape="square"
              disabled={hasAnswered}
              onPress={() => handleAnswer(idx)}
            />
          );
        })}
      </View>
    </View>
  );
}
