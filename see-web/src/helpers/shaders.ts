export const shaders = {
  viewDepth: {
    fragment: `
    precision highp float;

    #ifdef GL_ES
      precision mediump float;
    #endif

    // #ifdef LOGARITHMICDEPTH
    //   gl_FragDepthEXT = log2(vFragmentDepth) * logarithmicDepthConstant * 0.5;
    // #endif
    
    
    /// <summary>
    /// Uniform variables.
    /// <summary>
    uniform highp sampler2D SceneDepthTexture;
    uniform sampler2D textureSampler; // color texture from webgl?
    
    /// <summary>
    /// Varying variables.
    /// <summary>
    varying vec2 vUV;
   
    
    void main(void)
    {  
    vec4 sceneDepthTexture = texture2D(SceneDepthTexture, vUV);
    
    float sceneDepth = sceneDepthTexture.r;	// depth value from DepthRenderer: 0 to 1
        
    vec4 sceneDepthColors = vec4(sceneDepth, sceneDepth, sceneDepth, 1.0);
    gl_FragColor = sceneDepthColors;
    }
        `,
    vertex: `
    // Attributes
    attribute vec2 position;
    
    
    uniform vec2 scale;
    // Output
    varying vec2 vUV;
    
    const vec2 madd = vec2(0.5, 0.5);
    
    // #ifdef LOGARITHMICDEPTH
    //   vFragmentDepth = 1.0 + gl_Position.w;
    //   gl_Position.z = log2(max(0.000001, vFragmentDepth)) * logarithmicDepthConstant;
    // #endif
    
    #define CUSTOM_VERTEX_DEFINITIONS
    
    void main(void) {
    
    #define CUSTOM_VERTEX_MAIN_BEGIN
      
    
      vUV = (position * madd + madd) * scale;
      gl_Position = vec4(position, 0.0, 1.0);
    
    #define CUSTOM_VERTEX_MAIN_END
    }
        `,
  },
};
