import React, { useCallback } from 'react';
import {
    Pressable,
    StyleSheet, Text
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring
} from 'react-native-reanimated';

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
type Props = {
    currentIndex: any;
    length: number;
    flatListRef: any;
};
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const grad1 = '#085161'
const grad2 = '#11a2c1';

const Button = ({ currentIndex, length, flatListRef }: Props) => {
    const router = useRouter();
    const rnBtnStyle = useAnimatedStyle(() => {
        return {
            width:
                currentIndex.value === length - 1 ? withSpring(140) : withSpring(60),
            height: 60,
        };
    }, [currentIndex, length]);



    const onPress = useCallback(() => {
        router.replace('/create-account'); // Navigate to create account page when the last button is pressed
        return;

    }, []);
    return (
        <LinearGradient
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} colors={[grad1, grad2]}
            locations={[0.196, 1]}
            style={[styles.container, {
                flex: 1,

            }]}
        >
            <AnimatedPressable style={{ width: '100%', height: '100%' }} onPress={onPress}>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: '800', fontFamily: 'Poppins', width: '100%', textAlign: 'center', lineHeight: 28 }}>
                    Get Started
                </Text>
            </AnimatedPressable>
        </LinearGradient>

    );
};

export default Button;

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 10,
        //  backgroundColor: '#33E4DB',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        maxHeight: 60,
        minWidth: '80%',
        marginBottom: 30,
    },
    textStyle: {
        fontFamily: 'Poppins',
        color: 'white',
        position: 'absolute',
        fontWeight: '900',
        fontSize: 24,
    },
    imageStyle: {
        width: 45,
        height: 45,
        lineHeight: 60,
        marginTop: 15,
        marginLeft: 15,
        position: 'absolute',
    },
});