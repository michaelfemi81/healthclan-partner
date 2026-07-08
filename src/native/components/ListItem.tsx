import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    ImageURISource,
    StyleSheet,
    View,
    useWindowDimensions
} from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedStyle
} from 'react-native-reanimated';
type Props = {
    item: { text: string; image: ImageURISource; sub: string };
    index: number;
    x: any;
};
const grad1 = '#085161'
const grad2 = '#11a2c1';
const { width, } = Dimensions.get('window');

const ListItem = ({ item, index, x }: Props) => {
    const router = useRouter();
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const maxImageSize = Math.min(SCREEN_WIDTH * 0.9, 520);
    const rnImageStyle = useAnimatedStyle(() => {
        const translateY = interpolate(
            x.value,
            [
                (index - 1) * SCREEN_WIDTH,
                index * SCREEN_WIDTH,
                (index + 1) * SCREEN_WIDTH,
            ],
            [100, 0, 100],
            Extrapolation.CLAMP
        );
        const opacity = interpolate(
            x.value,
            [
                (index - 1) * SCREEN_WIDTH,
                index * SCREEN_WIDTH,
                (index + 1) * SCREEN_WIDTH,
            ],
            [0, 1, 0],
            Extrapolation.CLAMP
        );
        return {
            opacity,
            width: maxImageSize,
            height: maxImageSize,
            transform: [{ translateY }],
            borderRadius: 0.5 * maxImageSize,
        };
    }, [index, x]);

    const rnTextStyle = useAnimatedStyle(() => {
        const translateY = interpolate(
            x.value,
            [
                (index - 1) * SCREEN_WIDTH,
                index * SCREEN_WIDTH,
                (index + 1) * SCREEN_WIDTH,
            ],
            [100, 0, 100],
            Extrapolation.CLAMP
        );
        const opacity = interpolate(
            x.value,
            [
                (index - 1) * SCREEN_WIDTH,
                index * SCREEN_WIDTH,
                (index + 1) * SCREEN_WIDTH,
            ],
            [0, 1, 0],
            Extrapolation.CLAMP
        );
        return {
            opacity,
            transform: [{ translateY }],
        };
    }, [index, x]);
    return (
        <View style={[styles.itemContainer, { width: SCREEN_WIDTH }]}>

            <LinearGradient
                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} colors={['rgba(236, 242, 255, 0.1)', '#ECF2FF',]}
                locations={[0.196, 1]}
                style={[styles.eclipse, {
                    flex: 1, flexDirection: 'row', alignContent: 'center', padding: 0, alignItems: 'center',
                    justifyContent: 'center',

                }]}
            >
                <Animated.Image
                    source={item.image}
                    style={rnImageStyle}
                    resizeMode="contain"

                />
            </LinearGradient>

            <Animated.Text style={[styles.textItem, rnTextStyle]}>
                {item.text}
            </Animated.Text>
            <Animated.Text style={[styles.sub, rnTextStyle]}>
                {item.sub}

            </Animated.Text>
        </View >
    );
};

export default React.memo(ListItem);

const styles = StyleSheet.create({
    itemContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    textItem: {
        fontFamily: 'Poppins',
        fontWeight: '700',
        lineHeight: 41,
        fontSize: 32,
        paddingLeft: 4,
        paddingRight: 4,
        textAlign: 'center',
        color: grad2,
        width: '90%',
    },
    skip: {
        fontFamily: 'Poppins',
        fontWeight: '100',
        lineHeight: 25,
        fontSize: 15,
        paddingLeft: 4,
        paddingRight: 4,
        textAlign: 'right',
        color: '#000',
        width: '90%',
        maxHeight: 25,
        justifyContent: "center",
        alignItems: "center", flex: 1
    },
    sub: {
        fontFamily: 'Poppins',
        fontWeight: '100',
        fontSize: 15,
        paddingLeft: 4,
        paddingRight: 4,
        textAlign: 'center',
        color: '#252525',
        width: '100%',
        textOverflow: 'ellipsis',
        maxHeight: 60,
        justifyContent: "center",
        alignItems: "center", flex: 1,
        zIndex: 999,
        position: 'relative',
    },
    eclipse: {
        height: width - 10,
        width: width - 10,
        maxHeight: width - 10,
        borderRadius: (width - 10) / 2,
        position: 'relative',

    }
});
