import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    interpolateColor,
    useAnimatedStyle,
} from 'react-native-reanimated';

type Props = {
    length: number;
    x: any;
};
const grad2 = '#11a2c1';
const PaginationDot = ({ index, screenWidth, x }: { index: number; screenWidth: number; x: any }) => {
    const itemRnStyle = useAnimatedStyle(() => ({
        width: interpolate(
            x.value,
            [(index - 1) * screenWidth, index * screenWidth, (index + 1) * screenWidth],
            [10, 25, 10],
            Extrapolation.CLAMP
        ),
        backgroundColor: interpolateColor(
            x.value,
            [(index - 1) * screenWidth, index * screenWidth, (index + 1) * screenWidth],
            ['#252525', grad2, '#252525']
        ),
    }), [index, screenWidth, x]);

    return <Animated.View style={[styles.itemStyle, itemRnStyle]} />;
};

const PaginationElement = ({ length, x }: Props) => {
    const { width: SCREEN_WIDTH } = useWindowDimensions();

    return (
        <View style={styles.container}>
            {Array.from({ length }).map((_, index) => {
                return <PaginationDot index={index} screenWidth={SCREEN_WIDTH} x={x} key={index} />;
            })}
        </View>
    );
};

export default PaginationElement;

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center', flex: 1
    },
    itemStyle: {
        width: 25,
        height: 10,
        borderRadius: 5,

        marginHorizontal: 5,
    },
});
