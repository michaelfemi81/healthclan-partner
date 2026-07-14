import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import PropTypes from 'prop-types';

const Loading = ({ transparent, isDark }: any) => {
    return (
        <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', backgroundColor: transparent ? 'transparent' : isDark ? '#E9F6FE' : '#fff', }}>
            <ActivityIndicator size="large" color={transparent ? '#fff' : isDark ? '#fff' : '#E9F6FE'} />
        </View>
    )
};

Loading.propTypes = {
    isDark: PropTypes.bool
};

Loading.defaultProps = {
    isDark: false
};
export default Loading;
