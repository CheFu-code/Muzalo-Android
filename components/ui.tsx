import { muzaloTheme as c } from "@/constants/tokens";
import { Ionicons } from "@expo/vector-icons";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import React, { ComponentProps, ReactNode, useState } from "react";
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
    ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureDetector, Pressable } from "react-native-gesture-handler";

export type AppIcon = ComponentProps<typeof Ionicons>["name"];

export function Screen({
    children,
    edges,
}: {
    children: ReactNode;
    edges?: ComponentProps<typeof SafeAreaView>["edges"];
}) {
    return (
        <SafeAreaView
            edges={edges ?? ["top", "left", "right"]}
            style={ui.screen}
        >
            {children}
        </SafeAreaView>
    );
}

export function IconButton({
    icon,
    label,
    onPress,
    active,
    disabled,
    color,
    style,
}: {
    icon: AppIcon;
    label: string;
    onPress: () => void;
    active?: boolean;
    disabled?: boolean;
    color?: string;
    style?: ViewStyle;
}) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled, selected: active }}
            disabled={disabled}
            onPress={onPress}
            hitSlop={8}
            style={({ pressed }) => [
                ui.iconButton,
                active && { backgroundColor: c.accentSoft },
                disabled && { opacity: 0.4 },
                style,
                pressed && !disabled && { opacity: 0.7 },
            ]}
        >
            <Ionicons
                name={icon}
                size={22}
                color={color ?? (active ? c.accent : c.text)}
            />
        </Pressable>
    );
}

export function ScreenHeader({
    title,
    right,
    onBack,
    close = false,
    dragGesture,
}: {
    title: string;
    right?: ReactNode;
    onBack?: () => void;
    close?: boolean;
    dragGesture?: ComponentProps<typeof GestureDetector>["gesture"];
}) {
    const goBack = useBackNavigation(onBack);
    const heading = (
        <Text
            numberOfLines={1}
            accessibilityRole="header"
            style={ui.headerTitle}
        >
            {title}
        </Text>
    );
    return (
        <View style={ui.header}>
            <IconButton
                icon={close ? "chevron-down" : "chevron-back"}
                label={close ? "Close screen" : "Go back"}
                onPress={goBack}
            />
            {dragGesture ? (
                <GestureDetector gesture={dragGesture}>
                    <View
                        collapsable={false}
                        style={{
                            flex: 1,
                            minWidth: 0,
                            minHeight: 44,
                            flexDirection: "row",
                            alignItems: "center",
                        }}
                    >
                        {heading}
                    </View>
                </GestureDetector>
            ) : heading}
            <View style={{ minWidth: 44, alignItems: "flex-end" }}>
                {right}
            </View>
        </View>
    );
}

export function ActionButton({
    label,
    onPress,
    icon,
    variant = "primary",
    disabled,
    loading,
}: {
    label: string;
    onPress: () => void;
    icon?: AppIcon;
    variant?: "primary" | "secondary" | "danger";
    disabled?: boolean;
    loading?: boolean;
}) {
    const foreground =
        variant === "primary"
            ? c.onAccent
            : variant === "danger"
              ? c.danger
              : c.text;
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{
                disabled: disabled || loading,
                busy: loading,
            }}
            disabled={disabled || loading}
            onPress={onPress}
            style={({ pressed }) => [
                ui.button,
                {
                    backgroundColor:
                        variant === "primary"
                            ? c.accent
                            : variant === "danger"
                              ? c.dangerSoft
                              : c.surface,
                    borderColor: variant === "primary" ? c.accent : c.border,
                },
                (disabled || loading) && { opacity: 0.5 },
                pressed && !disabled && !loading && { opacity: 0.8 },
            ]}
        >
            {loading ? (
                <ActivityIndicator color={foreground} size="small" />
            ) : icon ? (
                <Ionicons name={icon} size={20} color={foreground} />
            ) : null}
            <Text
                style={{
                    color: foreground,
                    fontSize: 14,
                    fontWeight: "700",
                    flexShrink: 1,
                    textAlign: "center",
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}

export function SearchField({
    value,
    onChangeText,
    placeholder = "Search music",
}: {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
}) {
    return (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <View style={ui.search}>
                <Ionicons name="search-outline" size={19} color={c.muted} />
                <TextInput
                    accessibilityLabel={placeholder}
                    value={value}
                    onChangeText={onChangeText}
                    autoCorrect={false}
                    returnKeyType="search"
                    placeholder={placeholder}
                    placeholderTextColor={c.muted}
                    selectionColor={c.accent}
                    style={{
                        flex: 1,
                        minWidth: 0,
                        color: c.text,
                        fontSize: 15,
                        minHeight: 48,
                        paddingHorizontal: 10,
                        paddingVertical: 12,
                    }}
                />
                {value.length > 0 && (
                    <IconButton
                        icon="close-circle"
                        label="Clear search"
                        onPress={() => onChangeText("")}
                        color={c.muted}
                    />
                )}
            </View>
        </View>
    );
}

export function FormField({
    label,
    style,
    ...props
}: TextInputProps & { label: string }) {
    return (
        <View style={{ gap: 8 }}>
            <Text style={ui.label}>{label}</Text>
            <TextInput
                accessibilityLabel={label}
                placeholderTextColor={c.muted}
                selectionColor={c.accent}
                {...props}
                style={[
                    ui.input,
                    props.multiline && {
                        minHeight: 120,
                        textAlignVertical: "top",
                    },
                    style,
                ]}
            />
        </View>
    );
}

export function Artwork({
    uri,
    size = 128,
    round = false,
    icon = "musical-notes-outline",
}: {
    uri?: string | null;
    size?: number;
    round?: boolean;
    icon?: AppIcon;
}) {
    const [failed, setFailed] = useState<string | null>(null);
    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: round ? size / 2 : Math.min(24, size / 4),
                borderWidth: 1,
                borderColor: c.border,
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: c.accentSoft,
            }}
        >
            {uri && uri !== failed ? (
                <Image
                    source={{ uri }}
                    onError={() => setFailed(uri)}
                    style={{ width: size, height: size }}
                    resizeMode="cover"
                    accessibilityIgnoresInvertColors
                />
            ) : (
                <Ionicons
                    name={icon}
                    size={Math.min(size * 0.4, 64)}
                    color={c.accent}
                />
            )}
        </View>
    );
}

export function SongHeading({
    title,
    artist,
    coverArt,
}: {
    title?: string;
    artist?: string | null;
    coverArt?: string | null;
}) {
    return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Artwork uri={coverArt} size={60} />
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                    numberOfLines={2}
                    style={{ color: c.text, fontSize: 17, fontWeight: "600" }}
                >
                    {title || "Unknown title"}
                </Text>
                <Text numberOfLines={1} style={[ui.muted, { marginTop: 5 }]}>
                    {artist || "Unknown artist"}
                </Text>
            </View>
        </View>
    );
}

export function EmptyState({
    title,
    message,
    icon = "musical-notes-outline",
}: {
    title: string;
    message?: string;
    icon?: AppIcon;
}) {
    return (
        <View
            style={{
                alignItems: "center",
                paddingHorizontal: 28,
                paddingVertical: 44,
            }}
        >
            <View
                style={{
                    width: 68,
                    height: 68,
                    borderRadius: 22,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: c.accentSoft,
                    marginBottom: 18,
                }}
            >
                <Ionicons name={icon} size={30} color={c.accent} />
            </View>
            <Text
                style={{
                    color: c.text,
                    fontSize: 19,
                    fontWeight: "600",
                    textAlign: "center",
                }}
            >
                {title}
            </Text>
            {message && (
                <Text
                    style={[
                        ui.body,
                        { color: c.muted, textAlign: "center", marginTop: 8 },
                    ]}
                >
                    {message}
                </Text>
            )}
        </View>
    );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <View
            style={{
                paddingVertical: 12,
                gap: 5,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: c.border,
            }}
        >
            <Text style={ui.label}>{label}</Text>
            <Text selectable style={ui.body}>
                {value}
            </Text>
        </View>
    );
}

export const ui = StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: {
        width: "100%",
        maxWidth: 640,
        alignSelf: "center",
        padding: 20,
        paddingBottom: 40,
        gap: 20,
    },
    card: {
        padding: 16,
        backgroundColor: c.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: c.border,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    headerTitle: {
        flex: 1,
        color: c.text,
        fontSize: 17,
        fontWeight: "600",
        textAlign: "center",
    },
    iconButton: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
    },
    button: {
        minHeight: 48,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    search: {
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 14,
        backgroundColor: c.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: c.border,
    },
    input: {
        minHeight: 50,
        padding: 14,
        color: c.text,
        fontSize: 15,
        lineHeight: 23,
        borderRadius: 14,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
    },
    title: {
        color: c.text,
        fontSize: 26,
        fontWeight: "700",
        letterSpacing: -0.5,
    },
    body: { color: c.text, fontSize: 14, lineHeight: 22 },
    muted: { color: c.muted, fontSize: 13, lineHeight: 20 },
    label: { color: c.muted, fontSize: 12, fontWeight: "500" },
});
