import React, { useCallback } from 'react';
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
const grad1 = '#085161'
const grad2 = '#11a2c1';
const PaginationElement = ({ length, x }: Props) => {
    const { width: SCREEN_WIDTH } = useWindowDimensions();

    const PaginationComponent = useCallback(({ index }: { index: number }) => {
        const itemRnStyle = useAnimatedStyle(() => {
            const width = interpolate(
                x.value,
                [
                    (index - 1) * SCREEN_WIDTH,
                    index * SCREEN_WIDTH,
                    (index + 1) * SCREEN_WIDTH,
                ],
                [10, 25, 10],
                Extrapolation.CLAMP
            );

            const bgColor = interpolateColor(
                x.value,
                [
                    (index - 1) * SCREEN_WIDTH,
                    index * SCREEN_WIDTH,
                    (index + 1) * SCREEN_WIDTH,
                ],
                ['#252525', grad2, '#252525']
            );

            return {
                width,
                backgroundColor: bgColor,
            };
        }, [x]);
        return <Animated.View style={[styles.itemStyle, itemRnStyle]} />;
    }, []);

    return (
        <View style={styles.container}>
            {Array.from({ length }).map((_, index) => {
                return <PaginationComponent index={index} key={index} />;
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